// Turns a Firebase error into something a customer can act on. Returns null when nothing should be shown.
export function firebaseErrorMessage(error) {
  switch (error?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return null; // they simply closed the window
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.';
    case 'auth/unauthorized-domain':
      return "This site's address isn't authorized in Firebase. Add it under Authentication → Settings → Authorized domains.";
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in your Firebase project (Authentication → Sign-in method).';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Google sign-in failed. Please try again.';
  }
}