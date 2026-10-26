// Thin wrapper around the Firebase SDK. The SDK is loaded on demand (when someone clicks the
// button), so it doesn't add weight to the main bundle.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(config).every(Boolean);

// Opens the Google popup and resolves to a Firebase ID token for our backend to verify.
export async function signInWithGoogle() {
  const [{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, signInWithPopup, signOut }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const auth = getAuth(getApps()[0] || initializeApp(config));
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' }); // always let them choose the account
  const { user } = await signInWithPopup(auth, provider);
  const idToken = await user.getIdToken();
  await signOut(auth); // we only needed the token; our own session cookie takes over from here
  return idToken;
}