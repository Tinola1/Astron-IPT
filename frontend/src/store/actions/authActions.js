import * as authApi from '../../api/auth';
import {
  AUTH_REQUEST, AUTH_SUCCESS, AUTH_FAIL,
  LOAD_USER_SUCCESS, LOAD_USER_FAIL, LOGOUT, CLEAR_AUTH_ERROR,
} from '../constants/authConstants';

// Restore the session from the httpOnly cookie (called once in App.jsx)
export const loadUser = () => async (dispatch) => {
  try {
    const d = await authApi.fetchMe();
    dispatch({ type: LOAD_USER_SUCCESS, payload: d.user });
  } catch {
    dispatch({ type: LOAD_USER_FAIL });
  }
};

// Shared by login / register / reset: resolves to the user, or null on failure
const authenticate = (apiCall) => async (dispatch) => {
  dispatch({ type: AUTH_REQUEST });
  try {
    const d = await apiCall();
    dispatch({ type: AUTH_SUCCESS, payload: d.user });
    return d.user;
  } catch (e) {
    dispatch({ type: AUTH_FAIL, payload: e.message });
    return null;
  }
};

export const login = (credentials) => authenticate(() => authApi.loginUser(credentials));
export const register = (data) => authenticate(() => authApi.registerUser(data));
export const resetUserPassword = (token, password) =>
  authenticate(() => authApi.resetPassword(token, password));

// Google sign-in. Resolves to { user, created, linked, passwordCleared }, or null on failure
// (the reason is stored in state.auth.error, which the login/register pages already display).
export const loginWithGoogle = (idToken) => async (dispatch) => {
  dispatch({ type: AUTH_REQUEST });
  try {
    const data = await authApi.firebaseLogin(idToken);
    dispatch({ type: AUTH_SUCCESS, payload: data.user });
    return data;
  } catch (e) {
    dispatch({ type: AUTH_FAIL, payload: e.message });
    return null;
  }
};

// keep the navbar etc. in sync after the profile changes
export const setAuthUser = (user) => ({ type: AUTH_SUCCESS, payload: user });

export const logout = () => async (dispatch) => {
  await authApi.logoutUser().catch(() => {});
  dispatch({ type: LOGOUT });
};

export const clearAuthError = () => ({ type: CLEAR_AUTH_ERROR });