const { importX509, jwtVerify, decodeProtectedHeader } = require('jose');
const { httpError } = require('./http');

// Verifies Firebase ID tokens the way Firebase documents it for third-party JWT libraries:
// RS256 signature, `kid` among Google's published public keys, aud = project id,
// iss = https://securetoken.google.com/<project id>, sub present, auth_time in the past.
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000;
const MIN_REFETCH_MS = 60 * 1000; // don't hammer Google when someone sends tokens with unknown key ids
const INVALID = 'Invalid or expired Google sign-in. Please try again.';

async function fetchGoogleCerts() {
  const res = await fetch(CERTS_URL, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`certs request failed with status ${res.status}`);
  const match = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
  return { certs: await res.json(), maxAgeMs: match ? Number(match[1]) * 1000 : DEFAULT_MAX_AGE_MS };
}

// fetchCerts and now are injectable so the logic can be tested without the network
function createFirebaseVerifier({ projectId, fetchCerts = fetchGoogleCerts, now = Date.now }) {
  let certs = null; // { kid: PEM certificate }
  let expiresAt = 0;
  let lastFetch = -Infinity;
  let loading = null;
  const keys = new Map(); // kid -> imported public key

  const load = () => {
    if (!loading) {
      loading = (async () => {
        try {
          const r = await fetchCerts();
          if (!r || typeof r.certs !== 'object' || r.certs === null) throw new Error('unexpected certs response');
          certs = r.certs;
          expiresAt = now() + (r.maxAgeMs || DEFAULT_MAX_AGE_MS);
          lastFetch = now();
          keys.clear();
        } catch (e) {
          console.error('Could not load Google signing keys:', e.message);
          throw httpError(503, 'Could not reach Google to verify your sign-in. Please try again.');
        } finally {
          loading = null;
        }
      })();
    }
    return loading;
  };

  async function keyFor(kid) {
    if (!certs || now() >= expiresAt) await load();
    if (!certs[kid] && now() - lastFetch >= MIN_REFETCH_MS) await load(); // Google rotates keys
    const pem = certs[kid];
    if (!pem) throw httpError(401, INVALID);
    if (!keys.has(kid)) keys.set(kid, await importX509(pem, 'RS256'));
    return keys.get(kid);
  }

  return async function verify(idToken) {
    if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 8192) throw httpError(401, INVALID);

    let header;
    try {
      header = decodeProtectedHeader(idToken);
    } catch {
      throw httpError(401, INVALID);
    }
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw httpError(401, INVALID);

    const key = await keyFor(header.kid);
    let payload;
    try {
      ({ payload } = await jwtVerify(idToken, key, {
        algorithms: ['RS256'],
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
        requiredClaims: ['exp', 'iat', 'sub'],
        currentDate: new Date(now()),
        clockTolerance: 5,
      }));
    } catch (e) {
      console.warn('Firebase token rejected:', e.code || e.message);
      throw httpError(401, INVALID);
    }

    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw httpError(401, INVALID);
    if (typeof payload.auth_time !== 'number' || payload.auth_time * 1000 > now() + 5000) throw httpError(401, INVALID);

    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      email_verified: payload.email_verified === true,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
      provider: payload.firebase?.sign_in_provider,
    };
  };
}

let current; // { projectId, verify }
async function verifyFirebaseIdToken(idToken) {
  const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
  if (!projectId) throw httpError(503, 'Google sign-in is not configured on the server (FIREBASE_PROJECT_ID is missing).');
  if (!current || current.projectId !== projectId) current = { projectId, verify: createFirebaseVerifier({ projectId }) };
  return current.verify(idToken);
}

module.exports = { createFirebaseVerifier, verifyFirebaseIdToken };