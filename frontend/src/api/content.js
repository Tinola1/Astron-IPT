import client from './client';

// shop (public)
export const getContent = (type) => client.get('/content', { params: { type } }).then((r) => r.data);

// admin: form = { type, title, body, link, order, isPublished, removeImage? }, file = File | null
const toForm = (form, file) => {
  const fd = new FormData();
  fd.append('data', JSON.stringify(form));
  if (file) fd.append('image', file);
  return fd;
};
export const listContent = (type) => client.get('/admin/content', { params: { type } }).then((r) => r.data);
export const createContent = (form, file) => client.post('/admin/content', toForm(form, file)).then((r) => r.data);
export const updateContent = (id, form, file) => client.put(`/admin/content/${id}`, toForm(form, file)).then((r) => r.data);
export const setContentPublished = (id, isPublished) => client.put(`/admin/content/${id}/published`, { isPublished }).then((r) => r.data);
export const deleteContent = (id) => client.delete(`/admin/content/${id}`).then((r) => r.data);