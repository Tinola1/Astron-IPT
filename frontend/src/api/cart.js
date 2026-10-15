import client from './client';

export const getCart = () => client.get('/cart').then((r) => r.data);
export const addCartItem = (data) => client.post('/cart/items', data).then((r) => r.data);
export const updateCartItemApi = (id, data) => client.put(`/cart/items/${id}`, data).then((r) => r.data);
export const removeCartItemApi = (id) => client.delete(`/cart/items/${id}`).then((r) => r.data);