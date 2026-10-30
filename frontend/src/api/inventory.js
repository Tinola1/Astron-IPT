import client from './client';

export const listInventory = (params) => client.get('/admin/inventory', { params }).then((r) => r.data);
export const getInventory = (id) => client.get(`/admin/inventory/${id}`).then((r) => r.data);
export const adjustStock = (id, data) => client.put(`/admin/inventory/${id}/adjust`, data).then((r) => r.data);
export const setThreshold = (id, threshold) => client.put(`/admin/inventory/${id}/threshold`, { threshold }).then((r) => r.data);
export const listUnits = (id, params) => client.get(`/admin/inventory/${id}/units`, { params }).then((r) => r.data);
export const receiveUnits = (id, data) => client.post(`/admin/inventory/${id}/units`, data).then((r) => r.data);
export const markUnitDamaged = (unitId) => client.put(`/admin/inventory/units/${unitId}/damaged`).then((r) => r.data);