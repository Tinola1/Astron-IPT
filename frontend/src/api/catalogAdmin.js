import client from './client';

// kind = 'categories' | 'brands'
export const listCatalog = (kind) => client.get(`/admin/catalog/${kind}`).then((r) => r.data);
export const createCatalog = (kind, data) => client.post(`/admin/catalog/${kind}`, data).then((r) => r.data);
export const updateCatalog = (kind, id, data) => client.put(`/admin/catalog/${kind}/${id}`, data).then((r) => r.data);
export const deleteCatalog = (kind, id) => client.delete(`/admin/catalog/${kind}/${id}`).then((r) => r.data);