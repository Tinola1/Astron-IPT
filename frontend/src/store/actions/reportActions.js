import * as api from '../../api/reports';
import {
  RP_DASH_REQUEST, RP_DASH_SUCCESS, RP_DASH_FAIL, RP_SALES_REQUEST, RP_SALES_SUCCESS, RP_SALES_FAIL,
} from '../constants/reportConstants';

export const fetchDashboard = () => async (dispatch) => {
  dispatch({ type: RP_DASH_REQUEST });
  try {
    dispatch({ type: RP_DASH_SUCCESS, payload: await api.getDashboard() });
  } catch (e) {
    dispatch({ type: RP_DASH_FAIL, payload: e.message });
  }
};

let latest = 0; // ignore responses that arrive out of order while the admin changes the range quickly

export const fetchSalesReport = (params) => async (dispatch) => {
  const id = ++latest;
  dispatch({ type: RP_SALES_REQUEST });
  try {
    const data = await api.getSalesReport(params);
    if (id === latest) dispatch({ type: RP_SALES_SUCCESS, payload: data });
  } catch (e) {
    if (id === latest) dispatch({ type: RP_SALES_FAIL, payload: e.message });
  }
};