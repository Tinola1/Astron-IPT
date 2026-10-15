import { CART_REQUEST, CART_SUCCESS, CART_FAIL, CART_RESET } from '../constants/cartConstants';
import { LOGOUT } from '../constants/authConstants';

const initialState = {
  items: [], count: 0, itemsTotal: 0, addOnsTotal: 0, installationFee: 0, subtotal: 0,
  hasInstallation: false, hasIssues: false, loading: false, error: null,
};

// The server is the source of truth: every cart call returns the full priced cart
export default function cartReducer(state = initialState, action) {
  switch (action.type) {
    case CART_REQUEST:
      return { ...state, loading: true, error: null };
    case CART_SUCCESS:
      return { ...state, ...action.payload, loading: false, error: null };
    case CART_FAIL:
      return { ...state, loading: false, error: action.payload };
    case CART_RESET:
    case LOGOUT:
      return initialState;
    default:
      return state;
  }
}