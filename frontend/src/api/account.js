import client from './client';

export const getAccount = () => client.get('/account').then((r) => r.data);
export const updateProfileApi = (data) => client.put('/account/profile', data).then((r) => r.data);
export const changePasswordApi = (data) => client.put('/account/password', data).then((r) => r.data);
export const addAddressApi = (data) => client.post('/account/addresses', data).then((r) => r.data);
export const updateAddressApi = (id, data) => client.put(`/account/addresses/${id}`, data).then((r) => r.data);
export const setDefaultAddressApi = (id) => client.put(`/account/addresses/${id}/default`).then((r) => r.data);
export const deleteAddressApi = (id) => client.delete(`/account/addresses/${id}`).then((r) => r.data);