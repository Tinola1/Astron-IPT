import client from './client';

export const listOrders = (params) => client.get('/admin/orders', { params }).then((r) => r.data);
export const getOrder = (id) => client.get(`/admin/orders/${id}`).then((r) => r.data);
export const updateStatusApi = (id, data) => client.put(`/admin/orders/${id}/status`, data).then((r) => r.data);
export const downloadAdminReceipt = (id) => client.get(`/admin/orders/${id}/receipt`, { responseType: 'blob' }).then((r) => r.data);
export const resendEmailApi = (id) => client.post(`/admin/orders/${id}/resend-email`).then((r) => r.data);