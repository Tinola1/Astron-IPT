import { toast } from 'react-toastify';
import * as api from '../../api/adminProducts';
import {
  AP_REQUEST, AP_LIST_SUCCESS, AP_DETAIL_SUCCESS, AP_SAVE_REQUEST, AP_SAVE_SUCCESS, AP_FAIL, AP_CLEAR,
} from '../constants/adminProductConstants';

let latest = 0; // ignore list responses that arrive out of order

export const fetchAdminProducts = (params) => async (dispatch) => {
  const id = ++latest;
  dispatch({ type: AP_REQUEST });
  try {
    const data = await api.listProducts(params);
    if (id === latest) dispatch({ type: AP_LIST_SUCCESS, payload: data });
  } catch (e) {
    if (id === latest) dispatch({ type: AP_FAIL, payload: e.message });
  }
};

export const fetchAdminProduct = (id) => async (dispatch) => {
  dispatch({ type: AP_REQUEST });
  try {
    dispatch({ type: AP_DETAIL_SUCCESS, payload: await api.getProduct(id) });
  } catch (e) {
    dispatch({ type: AP_FAIL, payload: e.message });
  }
};

// id = null creates, otherwise updates. Resolves to the product, or null on failure.
export const saveProduct = (id, formData) => async (dispatch) => {
  dispatch({ type: AP_SAVE_REQUEST });
  try {
    const product = id ? await api.updateProduct(id, formData) : await api.createProduct(formData);
    dispatch({ type: AP_SAVE_SUCCESS });
    return product;
  } catch (e) {
    dispatch({ type: AP_FAIL, payload: e.message });
    return null;
  }
};

export const deleteProduct = (id) => async () => {
  try {
    await api.deleteProductApi(id);
    return true;
  } catch (e) {
    toast.error(e.message);
    return false;
  }
};

export const bulkDeleteProducts = (ids) => async () => {
  try {
    await api.bulkDeleteApi(ids);
    return true;
  } catch (e) {
    toast.error(e.message);
    return false;
  }
};

export const clearAdminProduct = () => ({ type: AP_CLEAR });