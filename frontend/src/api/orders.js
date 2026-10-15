import client from './client';

export const getQuote = (data) => client.post('/orders/quote', data).then((r) => r.data);
export const createOrder = (data) => client.post('/orders', data).then((r) => r.data);
export const getMyOrders = () => client.get('/orders').then((r) => r.data);
export const getOrderById = (id) => client.get(`/orders/${id}`).then((r) => r.data);
export const cancelOrderApi = (id, reason) => client.put(`/orders/${id}/cancel`, { reason }).then((r) => r.data);