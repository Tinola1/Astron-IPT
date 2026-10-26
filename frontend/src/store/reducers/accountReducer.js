import {
  AC_REQUEST, AC_SUCCESS, AC_SAVE_REQUEST, AC_PROFILE_SAVED, AC_ADDRESSES_SAVED, AC_PASSWORD_SAVED, AC_FAIL, AC_CLEAR_ERROR,
} from '../constants/accountConstants';
import { LOGOUT } from '../constants/authConstants';

const initialState = { profile: null, loading: false, saving: false, error: null };

export default function accountReducer(state = initialState, action) {
  switch (action.type) {
    case AC_REQUEST:
      return { ...state, loading: true, error: null };
    case AC_SUCCESS:
      return { ...state, loading: false, profile: action.payload };
    case AC_SAVE_REQUEST:
      return { ...state, saving: true, error: null };
    case AC_PROFILE_SAVED:
      return { ...state, saving: false, profile: action.payload };
    case AC_ADDRESSES_SAVED:
      return { ...state, saving: false, profile: { ...state.profile, addresses: action.payload } };
    case AC_PASSWORD_SAVED:
      return { ...state, saving: false, profile: { ...state.profile, passwordSet: true } };
    case AC_FAIL:
      return { ...state, loading: false, saving: false, error: action.payload };
    case AC_CLEAR_ERROR:
      return { ...state, error: null };
    case LOGOUT:
      return initialState;
    default:
      return state;
  }
}