import * as catalogApi from '../../api/catalog';
import {
  PRODUCTS_REQUEST, PRODUCTS_SUCCESS, PRODUCTS_FAIL,
  SET_FILTERS, RESET_FILTERS, SET_VIEW_MODE, CATALOG_META_SUCCESS,
} from '../constants/productConstants';
import { PAGE_SIZE } from '../../utils/constants';

let latestRequest = 0; // ignore responses that arrive out of order

// page: which page to load; append: true for infinite scroll
export const fetchProducts = (page = 1, append = false) => async (dispatch, getState) => {
  const id = ++latestRequest;
  dispatch({ type: PRODUCTS_REQUEST });
  try {
    const { filters } = getState().products;
    const data = await catalogApi.getProducts({ ...filters, page, limit: PAGE_SIZE });
    if (id !== latestRequest) return;
    dispatch({ type: PRODUCTS_SUCCESS, payload: { ...data, append } });
  } catch (e) {
    if (id !== latestRequest) return;
    dispatch({ type: PRODUCTS_FAIL, payload: e.message });
  }
};

export const loadCatalogMeta = () => async (dispatch) => {
  try {
    const [categories, brands] = await Promise.all([catalogApi.getCategories(), catalogApi.getBrands()]);
    dispatch({ type: CATALOG_META_SUCCESS, payload: { categories, brands } });
  } catch {
    /* filters just stay empty; the product list shows its own error */
  }
};

export const setFilters = (patch) => ({ type: SET_FILTERS, payload: patch });
export const resetFilters = () => ({ type: RESET_FILTERS });
export const setViewMode = (mode) => ({ type: SET_VIEW_MODE, payload: mode });