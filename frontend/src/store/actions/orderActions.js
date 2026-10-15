import * as orderApi from '../../api/orders';
import {
  ORDER_REQUEST, ORDER_LIST_SUCCESS, ORDER_DETAIL_SUCCESS, ORDER_FAIL, ORDER_CLEAR_ERROR,
} from '../constants/orderConstants';
import { CART_RESET } from '../constants/cartConstants';

// Resolves to the order, or null on failure (error is stored in state.orders.error)
export const placeOrder = (payload) => async (dispatch) => {
  dispatch({ type: ORDER_REQUEST });
  try {
    const order = await orderApi.createOrder(payload);
    dispatch({ type: ORDER_DETAIL_SUCCESS, payload: order });
    dispatch({ type: CART_RESET }); // server already emptied the cart
    return order;
  } catch (e) {
    dispatch({ type: ORDER_FAIL, payload: e.message });
    return null;
  }
};

export const fetchMyOrders = () => async (dispatch) => {
  dispatch({ type: ORDER_REQUEST });
  try {
    dispatch({ type: ORDER_LIST_SUCCESS, payload: await orderApi.getMyOrders() });
  } catch (e) {
    dispatch({ type: ORDER_FAIL, payload: e.message });
  }
};

export const fetchOrder = (id) => async (dispatch) => {
  dispatch({ type: ORDER_REQUEST });
  try {
    dispatch({ type: ORDER_DETAIL_SUCCESS, payload: await orderApi.getOrderById(id) });
  } catch (e) {
    dispatch({ type: ORDER_FAIL, payload: e.message });
  }
};

export const cancelOrder = (id, reason) => async (dispatch) => {
  dispatch({ type: ORDER_REQUEST });
  try {
    dispatch({ type: ORDER_DETAIL_SUCCESS, payload: await orderApi.cancelOrderApi(id, reason) });
    return true;
  } catch (e) {
    dispatch({ type: ORDER_FAIL, payload: e.message });
    return false;
  }
};

export const clearOrderError = () => ({ type: ORDER_CLEAR_ERROR });