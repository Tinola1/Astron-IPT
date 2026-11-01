import {
  WISHLIST_REQUEST, WISHLIST_SUCCESS, WISHLIST_FAIL, WISHLIST_IDS, WISHLIST_RESET,
} from '../constants/wishlistConstants';
import { LOGOUT } from '../constants/authConstants';

const initialState = { ids: [], items: [], loading: false, error: null };

// ids drive the hearts on every product card; items are the full cards for the Wishlist page
export default function wishlistReducer(state = initialState, action) {
  switch (action.type) {
    case WISHLIST_REQUEST:
      return { ...state, loading: true, error: null };
    case WISHLIST_SUCCESS:
      return { ...state, ids: action.payload.ids, items: action.payload.items, loading: false, error: null };
    case WISHLIST_FAIL:
      return { ...state, loading: false, error: action.payload };
    case WISHLIST_IDS:
      return { ...state, ids: action.payload, items: state.items.filter((p) => action.payload.includes(String(p._id))) };
    case WISHLIST_RESET:
    case LOGOUT:
      return initialState;
    default:
      return state;
  }
}