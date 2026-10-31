import client from './client';

export const getStoreInfo = () => client.get('/admin/store/info').then((r) => r.data);
export const saveStoreInfo = (data) => client.put('/admin/store/info', data).then((r) => r.data);

export const listPromotions = () => client.get('/admin/store/promotions').then((r) => r.data);
export const createPromotion = (data) => client.post('/admin/store/promotions', data).then((r) => r.data);
export const updatePromotion = (id, data) => client.put(`/admin/store/promotions/${id}`, data).then((r) => r.data);
export const setPromotionActive = (id, isActive) => client.put(`/admin/store/promotions/${id}/active`, { isActive }).then((r) => r.data);
export const deletePromotion = (id) => client.delete(`/admin/store/promotions/${id}`).then((r) => r.data);