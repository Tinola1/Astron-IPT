import {
  AP_REQUEST, AP_LIST_SUCCESS, AP_DETAIL_SUCCESS, AP_SAVE_REQUEST, AP_SAVE_SUCCESS, AP_FAIL, AP_CLEAR,
} from '../constants/adminProductConstants';
import { LOGOUT } from '../constants/authConstants';

const initialState = { rows: [], total: 0, current: null, loading: false, saving: false, error: null };

export default function adminProductReducer(state = initialState, action) {
  switch (action.type) {
    case AP_REQUEST:
      return { ...state, loading: true, error: null };
    case AP_LIST_SUCCESS:
      return { ...state, loading: false, rows: action.payload.rows, total: action.payload.total };
    case AP_DETAIL_SUCCESS:
      return { ...state, loading: false, current: action.payload };
    case AP_SAVE_REQUEST:
      return { ...state, saving: true, error: null };
    case AP_SAVE_SUCCESS:
      return { ...state, saving: false };
    case AP_FAIL:
      return { ...state, loading: false, saving: false, error: action.payload };
    case AP_CLEAR:
      return { ...state, current: null, error: null };
    case LOGOUT:
      return initialState;
    default:
      return state;
  }
}