import {
  ORDER_REQUEST, ORDER_LIST_SUCCESS, ORDER_DETAIL_SUCCESS, ORDER_FAIL, ORDER_CLEAR_ERROR,
} from '../constants/orderConstants';
import { LOGOUT } from '../constants/authConstants';

const initialState = { list: [], current: null, loading: false, error: null };

export default function orderReducer(state = initialState, action) {
  switch (action.type) {
    case ORDER_REQUEST:
      return { ...state, loading: true, error: null };
    case ORDER_LIST_SUCCESS:
      return { ...state, loading: false, list: action.payload };
    case ORDER_DETAIL_SUCCESS:
      return {
        ...state,
        loading: false,
        current: action.payload,
        list: state.list.map((o) => (o._id === action.payload._id ? action.payload : o)),
      };
    case ORDER_FAIL:
      return { ...state, loading: false, error: action.payload };
    case ORDER_CLEAR_ERROR:
      return { ...state, error: null };
    case LOGOUT:
      return initialState;
    default:
      return state;
  }
}