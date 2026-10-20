import client from './client';

export const listProducts = (params) => client.get('/admin/products', { params }).then((r) => r.data);
export const getProduct = (id) => client.get(`/admin/products/${id}`).then((r) => r.data);
// formData: { data: <json string>, images: <files> }; axios sets the multipart boundary itself
export const createProduct = (formData) => client.post('/admin/products', formData).then((r) => r.data);
export const updateProduct = (id, formData) => client.put(`/admin/products/${id}`, formData).then((r) => r.data);
export const deleteProductApi = (id) => client.delete(`/admin/products/${id}`).then((r) => r.data);
export const bulkDeleteApi = (ids) => client.post('/admin/products/bulk-delete', { ids }).then((r) => r.data);