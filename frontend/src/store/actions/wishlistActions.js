import { toast } from 'react-toastify';
import * as api from '../../api/wishlist';
import {
  WISHLIST_REQUEST, WISHLIST_SUCCESS, WISHLIST_FAIL, WISHLIST_IDS, WISHLIST_RESET,
} from '../constants/wishlistConstants';

export const fetchWishlist = () => async (dispatch) => {
  dispatch({ type: WISHLIST_REQUEST });
  try {
    dispatch({ type: WISHLIST_SUCCESS, payload: await api.getWishlist() });
  } catch (e) {
    dispatch({ type: WISHLIST_FAIL, payload: e.message });
  }
};

// The heart changes straight away; if the server says no, it goes back and an error shows
export const toggleWishlist = (productId) => async (dispatch, getState) => {
  const before = getState().wishlist.ids;
  const id = String(productId);
  const saving = !before.includes(id);
  dispatch({ type: WISHLIST_IDS, payload: saving ? [id, ...before] : before.filter((x) => x !== id) });
  try {
    const r = saving ? await api.saveToWishlist(id) : await api.removeFromWishlist(id);
    dispatch({ type: WISHLIST_IDS, payload: r.ids });
    return saving;
  } catch (e) {
    dispatch({ type: WISHLIST_IDS, payload: before });
    toast.error(e.message);
    return null;
  }
};

export const resetWishlist = () => ({ type: WISHLIST_RESET });