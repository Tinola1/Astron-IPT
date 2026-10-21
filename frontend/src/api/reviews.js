import client from './client';

export const getReviews = (productId, params) => client.get(`/products/${productId}/reviews`, { params }).then((r) => r.data);
export const getReviewStatus = (productId) => client.get(`/products/${productId}/review-status`).then((r) => r.data);
export const createReview = (productId, data) => client.post(`/products/${productId}/reviews`, data).then((r) => r.data);
export const updateReview = (reviewId, data) => client.put(`/reviews/${reviewId}`, data).then((r) => r.data);