import {
  RP_DASH_REQUEST, RP_DASH_SUCCESS, RP_DASH_FAIL, RP_SALES_REQUEST, RP_SALES_SUCCESS, RP_SALES_FAIL,
} from '../constants/reportConstants';
import { LOGOUT } from '../constants/authConstants';

const initialState = {
  dashboard: null, dashLoading: false, dashError: null,
  sales: null, salesLoading: false, salesError: null,
};

export default function reportReducer(state = initialState, action) {
  switch (action.type) {
    case RP_DASH_REQUEST:
      return { ...state, dashLoading: true, dashError: null };
    case RP_DASH_SUCCESS:
      return { ...state, dashLoading: false, dashboard: action.payload };
    case RP_DASH_FAIL:
      return { ...state, dashLoading: false, dashError: action.payload };
    case RP_SALES_REQUEST:
      return { ...state, salesLoading: true, salesError: null };
    case RP_SALES_SUCCESS:
      return { ...state, salesLoading: false, sales: action.payload };
    case RP_SALES_FAIL:
      return { ...state, salesLoading: false, salesError: action.payload };
    case LOGOUT:
      return initialState;
    default:
      return state;
  }
}