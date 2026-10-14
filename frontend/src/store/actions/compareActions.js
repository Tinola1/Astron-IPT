import { TOGGLE_COMPARE, CLEAR_COMPARE } from '../constants/compareConstants';

export const toggleCompare = (product) => ({ type: TOGGLE_COMPARE, payload: product });
export const clearCompare = () => ({ type: CLEAR_COMPARE });