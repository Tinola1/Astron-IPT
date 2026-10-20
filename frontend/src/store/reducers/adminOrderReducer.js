import {
  AO_REQUEST, AO_LIST_SUCCESS, AO_DETAIL_SUCCESS, AO_SAVE_REQUEST, AO_SAVE_SUCCESS, AO_FAIL, AO_CLEAR,
} from '../constants/adminOrderConstants';
import { LOGOUT } from '../constants/authConstants';

const initialState = { rows: [], total: 0, current: null, loading: false, saving: false, error: null };

export default function adminOrderReducer(state = initialState, action) {
  switch (action.type) {
    case AO_REQUEST:
      return { ...state, loading: true, error: null };
    case AO_LIST_SUCCESS:
      return { ...state, loading: false, rows: action.payload.rows, total: action.payload.total };
    case AO_DETAIL_SUCCESS:
      return { ...state, loading: false, current: action.payload };
    case AO_SAVE_REQUEST:
      return { ...state, saving: true, error: null };
    case AO_SAVE_SUCCESS: {
      const o = action.payload;
      return {
        ...state,
        saving: false,
        current: o,
        // keep the list row in sync if it is loaded
        rows: state.rows.map((r) =>
          r._id === o._id ? { ...r, status: o.status, paymentStatus: o.payment.status } : r
        ),
      };
    }
    case AO_FAIL:
      return { ...state, loading: false, saving: false, error: action.payload };
    case AO_CLEAR:
      return { ...state, current: null, error: null };
    case LOGOUT:
      return initialState;
    default:
      return state;
  }
}