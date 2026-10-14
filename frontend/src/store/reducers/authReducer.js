import {
  AUTH_REQUEST, AUTH_SUCCESS, AUTH_FAIL,
  LOAD_USER_SUCCESS, LOAD_USER_FAIL, LOGOUT, CLEAR_AUTH_ERROR,
} from '../constants/authConstants';

// loading = true only while restoring the session on first page load
const initialState = { user: null, loading: true, error: null };

export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case AUTH_REQUEST:
    case CLEAR_AUTH_ERROR:
      return { ...state, error: null };
    case AUTH_SUCCESS:
      return { ...state, user: action.payload, error: null };
    case AUTH_FAIL:
      return { ...state, error: action.payload };
    case LOAD_USER_SUCCESS:
      return { ...state, user: action.payload, loading: false };
    case LOAD_USER_FAIL:
      return { ...state, user: null, loading: false };
    case LOGOUT:
      return { ...state, user: null, error: null };
    default:
      return state;
  }
}