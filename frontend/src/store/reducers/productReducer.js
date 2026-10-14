import {
  PRODUCTS_REQUEST, PRODUCTS_SUCCESS, PRODUCTS_FAIL,
  SET_FILTERS, RESET_FILTERS, SET_VIEW_MODE, CATALOG_META_SUCCESS,
} from '../constants/productConstants';
import { DEFAULT_FILTERS } from '../../utils/constants';

const initialState = {
  items: [],
  page: 1,
  pages: 1,
  total: 0,
  loading: false,
  error: null,
  filters: DEFAULT_FILTERS,
  viewMode: 'pagination', // 'pagination' | 'infinite'
  categories: [],
  brands: [],
};

export default function productReducer(state = initialState, action) {
  switch (action.type) {
    case PRODUCTS_REQUEST:
      return { ...state, loading: true, error: null };
    case PRODUCTS_SUCCESS: {
      const { products, page, pages, total, append } = action.payload;
      const items = append
        ? [...state.items, ...products.filter((p) => !state.items.some((i) => i._id === p._id))]
        : products;
      return { ...state, loading: false, items, page, pages, total };
    }
    case PRODUCTS_FAIL:
      return { ...state, loading: false, error: action.payload };
    case SET_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case RESET_FILTERS:
      return { ...state, filters: DEFAULT_FILTERS };
    case SET_VIEW_MODE:
      return { ...state, viewMode: action.payload };
    case CATALOG_META_SUCCESS:
      return { ...state, categories: action.payload.categories, brands: action.payload.brands };
    default:
      return state;
  }
}