import client from './client';

export const getWishlist = () => client.get('/wishlist').then((r) => r.data);
export const saveToWishlist = (productId) => client.put(`/wishlist/${productId}`).then((r) => r.data);
export const removeFromWishlist = (productId) => client.delete(`/wishlist/${productId}`).then((r) => r.data);