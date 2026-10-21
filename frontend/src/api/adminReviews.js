import client from './client';

export const listReviews = (params) => client.get('/admin/reviews', { params }).then((r) => r.data);
export const deleteReviewApi = (id) => client.delete(`/admin/reviews/${id}`).then((r) => r.data);