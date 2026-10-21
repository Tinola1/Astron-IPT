import * as catalogApi from '../../api/catalog';
import * as reviewApi from '../../api/reviews';
import {
  PD_REQUEST, PD_SUCCESS, PD_FAIL, PD_CLEAR, PD_REVIEWS_REQUEST, PD_REVIEWS_SUCCESS, PD_REVIEWS_FAIL,
  PD_SET_RATING_FILTER, PD_MINE_SUCCESS, PD_SAVE_REQUEST, PD_SAVE_SUCCESS, PD_SAVE_FAIL,
} from '../constants/productDetailConstants';

// silent = refresh in the background (no loading flash), used after a review changes the rating
export const fetchProductDetail = (id, { silent = false } = {}) => async (dispatch) => {
  if (!silent) dispatch({ type: PD_REQUEST });
  try {
    dispatch({ type: PD_SUCCESS, payload: await catalogApi.getProductById(id) });
  } catch (e) {
    if (!silent) dispatch({ type: PD_FAIL, payload: e.message });
  }
};

export const fetchReviews = (productId, page = 1) => async (dispatch, getState) => {
  dispatch({ type: PD_REVIEWS_REQUEST });
  try {
    const { ratingFilter } = getState().productDetail;
    const data = await reviewApi.getReviews(productId, { page, limit: 5, rating: ratingFilter || undefined });
    dispatch({ type: PD_REVIEWS_SUCCESS, payload: data });
  } catch {
    dispatch({ type: PD_REVIEWS_FAIL });
  }
};

export const fetchMyReviewStatus = (productId) => async (dispatch) => {
  try {
    dispatch({ type: PD_MINE_SUCCESS, payload: await reviewApi.getReviewStatus(productId) });
  } catch {
    dispatch({ type: PD_MINE_SUCCESS, payload: { eligible: false, review: null } });
  }
};

// Creates the review, or updates it if the customer already has one.
// Resolves to { masked } on success (masked = some words were filtered), or null on failure.
export const submitReview = (productId, values) => async (dispatch, getState) => {
  dispatch({ type: PD_SAVE_REQUEST });
  try {
    const existing = getState().productDetail.mine.review;
    const data = existing
      ? await reviewApi.updateReview(existing._id, values)
      : await reviewApi.createReview(productId, values);
    dispatch({ type: PD_SAVE_SUCCESS, payload: data.review });
    // the list and the product's average rating changed
    dispatch(fetchReviews(productId, 1));
    dispatch(fetchProductDetail(productId, { silent: true }));
    return { masked: data.masked };
  } catch (e) {
    dispatch({ type: PD_SAVE_FAIL, payload: e.message });
    return null;
  }
};

export const setRatingFilter = (rating) => ({ type: PD_SET_RATING_FILTER, payload: rating });
export const clearProductDetail = () => ({ type: PD_CLEAR });