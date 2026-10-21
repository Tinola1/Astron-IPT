import { AR_REQUEST, AR_LIST_SUCCESS, AR_FAIL } from '../constants/adminReviewConstants';
import { LOGOUT } from '../constants/authConstants';

const initialState = { rows: [], total: 0, loading: false, error: null };

export default function adminReviewReducer(state = initialState, action) {
  switch (action.type) {
    case AR_REQUEST:
      return { ...state, loading: true, error: null };
    case AR_LIST_SUCCESS:
      return { ...state, loading: false, rows: action.payload.rows, total: action.payload.total };
    case AR_FAIL:
      return { ...state, loading: false, error: action.payload };
    case LOGOUT:
      return initialState;
    default:
      return state;
  }
}