import {
  PD_REQUEST, PD_SUCCESS, PD_FAIL, PD_CLEAR, PD_REVIEWS_REQUEST, PD_REVIEWS_SUCCESS, PD_REVIEWS_FAIL,
  PD_SET_RATING_FILTER, PD_MINE_SUCCESS, PD_SAVE_REQUEST, PD_SAVE_SUCCESS, PD_SAVE_FAIL,
} from '../constants/productDetailConstants';
import { LOGOUT } from '../constants/authConstants';

const noMine = { loaded: false, eligible: false, review: null };

const initialState = {
  product: null,
  loading: false,
  error: null,
  reviews: [],
  total: 0,
  page: 1,
  pages: 1,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  ratingFilter: '',
  reviewsLoading: false,
  mine: noMine,
  saving: false,
  reviewError: null,
};

export default function productDetailReducer(state = initialState, action) {
  switch (action.type) {
    case PD_REQUEST:
      return { ...state, loading: true, error: null };
    case PD_SUCCESS:
      return { ...state, loading: false, product: action.payload };
    case PD_FAIL:
      return { ...state, loading: false, error: action.payload };
    case PD_CLEAR:
      return initialState;
    case PD_REVIEWS_REQUEST:
      return { ...state, reviewsLoading: true };
    case PD_REVIEWS_SUCCESS:
      return {
        ...state,
        reviewsLoading: false,
        reviews: action.payload.reviews,
        total: action.payload.total,
        page: action.payload.page,
        pages: action.payload.pages,
        distribution: action.payload.distribution,
      };
    case PD_REVIEWS_FAIL:
      return { ...state, reviewsLoading: false };
    case PD_SET_RATING_FILTER:
      return { ...state, ratingFilter: action.payload };
    case PD_MINE_SUCCESS:
      return { ...state, mine: { loaded: true, ...action.payload } };
    case PD_SAVE_REQUEST:
      return { ...state, saving: true, reviewError: null };
    case PD_SAVE_SUCCESS:
      return { ...state, saving: false, mine: { loaded: true, eligible: true, review: action.payload } };
    case PD_SAVE_FAIL:
      return { ...state, saving: false, reviewError: action.payload };
    case LOGOUT:
      return { ...state, mine: noMine, saving: false, reviewError: null };
    default:
      return state;
  }
}