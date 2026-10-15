import { toast } from 'react-toastify';
import * as cartApi from '../../api/cart';
import { CART_REQUEST, CART_SUCCESS, CART_FAIL, CART_RESET } from '../constants/cartConstants';

export const fetchCart = () => async (dispatch) => {
  dispatch({ type: CART_REQUEST });
  try {
    dispatch({ type: CART_SUCCESS, payload: await cartApi.getCart() });
  } catch (e) {
    dispatch({ type: CART_FAIL, payload: e.message });
  }
};

// Shared runner for mutations. Resolves to true on success, false on failure (with an error toast).
const mutate = (apiCall) => async (dispatch) => {
  dispatch({ type: CART_REQUEST });
  try {
    dispatch({ type: CART_SUCCESS, payload: await apiCall() });
    return true;
  } catch (e) {
    dispatch({ type: CART_FAIL, payload: e.message });
    toast.error(e.message);
    return false;
  }
};

export const addToCart = (productId, quantity = 1, addOns = []) =>
  mutate(() => cartApi.addCartItem({ productId, quantity, addOns }));
export const updateCartItem = (itemId, patch) => mutate(() => cartApi.updateCartItemApi(itemId, patch));
export const removeCartItem = (itemId) => mutate(() => cartApi.removeCartItemApi(itemId));
export const resetCart = () => ({ type: CART_RESET });