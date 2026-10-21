import { toast } from 'react-toastify';
import * as api from '../../api/adminReviews';
import { AR_REQUEST, AR_LIST_SUCCESS, AR_FAIL } from '../constants/adminReviewConstants';

let latest = 0; // ignore list responses that arrive out of order

export const fetchAdminReviews = (params) => async (dispatch) => {
  const id = ++latest;
  dispatch({ type: AR_REQUEST });
  try {
    const data = await api.listReviews(params);
    if (id === latest) dispatch({ type: AR_LIST_SUCCESS, payload: data });
  } catch (e) {
    if (id === latest) dispatch({ type: AR_FAIL, payload: e.message });
  }
};

export const deleteReview = (id) => async () => {
  try {
    await api.deleteReviewApi(id);
    return true;
  } catch (e) {
    toast.error(e.message);
    return false;
  }
};