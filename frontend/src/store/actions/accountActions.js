import * as api from '../../api/account';
import { setAuthUser } from './authActions';
import {
  AC_REQUEST, AC_SUCCESS, AC_SAVE_REQUEST, AC_PROFILE_SAVED, AC_ADDRESSES_SAVED, AC_PASSWORD_SAVED, AC_FAIL, AC_CLEAR_ERROR,
} from '../constants/accountConstants';

export const fetchAccount = () => async (dispatch) => {
  dispatch({ type: AC_REQUEST });
  try {
    dispatch({ type: AC_SUCCESS, payload: (await api.getAccount()).user });
  } catch (e) {
    dispatch({ type: AC_FAIL, payload: e.message });
  }
};

// Runs a save, resolving to true on success or false on failure (the reason is in state.account.error)
const save = (call, onSuccess) => async (dispatch) => {
  dispatch({ type: AC_SAVE_REQUEST });
  try {
    onSuccess(dispatch, await call());
    return true;
  } catch (e) {
    dispatch({ type: AC_FAIL, payload: e.message });
    return false;
  }
};

const addressesSaved = (dispatch, data) => dispatch({ type: AC_ADDRESSES_SAVED, payload: data.addresses });

export const saveProfile = (values) =>
  save(() => api.updateProfileApi(values), (dispatch, data) => {
    dispatch({ type: AC_PROFILE_SAVED, payload: data.user });
    // the navbar reads state.auth.user, so keep it in sync
    const { addresses, authProvider, passwordSet, ...publicUser } = data.user;
    dispatch(setAuthUser(publicUser));
  });

export const changePassword = (values) =>
  save(() => api.changePasswordApi(values), (dispatch) => dispatch({ type: AC_PASSWORD_SAVED }));

export const addAddress = (values) => save(() => api.addAddressApi(values), addressesSaved);
export const updateAddress = (id, values) => save(() => api.updateAddressApi(id, values), addressesSaved);
export const setDefaultAddress = (id) => save(() => api.setDefaultAddressApi(id), addressesSaved);
export const deleteAddress = (id) => save(() => api.deleteAddressApi(id), addressesSaved);

export const clearAccountError = () => ({ type: AC_CLEAR_ERROR });