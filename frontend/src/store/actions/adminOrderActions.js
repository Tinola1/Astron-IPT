import * as api from '../../api/adminOrders';
import {
  AO_REQUEST, AO_LIST_SUCCESS, AO_DETAIL_SUCCESS, AO_SAVE_REQUEST, AO_SAVE_SUCCESS, AO_FAIL, AO_CLEAR,
} from '../constants/adminOrderConstants';

let latest = 0; // ignore list responses that arrive out of order

export const fetchAdminOrders = (params) => async (dispatch) => {
  const id = ++latest;
  dispatch({ type: AO_REQUEST });
  try {
    const data = await api.listOrders(params);
    if (id === latest) dispatch({ type: AO_LIST_SUCCESS, payload: data });
  } catch (e) {
    if (id === latest) dispatch({ type: AO_FAIL, payload: e.message });
  }
};

export const fetchAdminOrder = (id) => async (dispatch) => {
  dispatch({ type: AO_REQUEST });
  try {
    dispatch({ type: AO_DETAIL_SUCCESS, payload: await api.getOrder(id) });
  } catch (e) {
    dispatch({ type: AO_FAIL, payload: e.message });
  }
};

// Resolves to { order, email } or null on failure (error is stored in state.adminOrders.error)
export const updateOrderStatus = (id, payload) => async (dispatch) => {
  dispatch({ type: AO_SAVE_REQUEST });
  try {
    const result = await api.updateStatusApi(id, payload);
    dispatch({ type: AO_SAVE_SUCCESS, payload: result.order });
    return result;
  } catch (e) {
    dispatch({ type: AO_FAIL, payload: e.message });
    return null;
  }
};

export const clearAdminOrder = () => ({ type: AO_CLEAR });