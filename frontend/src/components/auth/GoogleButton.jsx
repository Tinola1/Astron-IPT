import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, CircularProgress, Divider } from '@mui/material';
import { toast } from 'react-toastify';
import { isFirebaseConfigured, signInWithGoogle } from '../../lib/firebase';
import { firebaseErrorMessage } from '../../lib/firebaseErrors';
import { loginWithGoogle } from '../../store/actions/authActions';

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// "or" divider + Continue with Google. Renders nothing in production when Firebase isn't configured.
export default function GoogleButton({ label = 'Continue with Google' }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  if (!isFirebaseConfigured) {
    return import.meta.env.DEV ? (
      <Alert severity="info" sx={{ mt: 2 }}>
        Google sign-in is off. Add the VITE_FIREBASE_* values to frontend/.env and restart Vite.
      </Alert>
    ) : null;
  }

  const handleClick = async () => {
    setBusy(true);
    try {
      const idToken = await signInWithGoogle();
      const result = await dispatch(loginWithGoogle(idToken)); // a backend refusal shows in the page's error alert
      if (result) {
        const first = result.user.name.split(' ')[0];
        toast.success(result.created ? `Welcome to Astron, ${first}!` : `Welcome back, ${first}!`);
        if (result.passwordCleared) {
          toast.info(
            'Your existing account is now linked to Google and its old password was removed. Use "Forgot password" if you want one again.',
            { autoClose: 9000 }
          );
        }
        navigate(location.state?.from?.pathname || '/', { replace: true });
      }
    } catch (e) {
      const message = firebaseErrorMessage(e);
      if (message) toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Divider sx={{ my: 2 }}>or</Divider>
      <Button
        variant="outlined"
        fullWidth
        size="large"
        disabled={busy}
        onClick={handleClick}
        startIcon={busy ? <CircularProgress size={18} /> : <GoogleLogo />}
      >
        {busy ? 'Waiting for Google…' : label}
      </Button>
    </>
  );
}