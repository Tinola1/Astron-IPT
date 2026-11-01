import client from './client';

export const listZones = () => client.get('/admin/shop/zones').then((r) => r.data);
export const createZone = (data) => client.post('/admin/shop/zones', data).then((r) => r.data);
export const updateZone = (id, data) => client.put(`/admin/shop/zones/${id}`, data).then((r) => r.data);
export const deleteZone = (id) => client.delete(`/admin/shop/zones/${id}`).then((r) => r.data);

export const listAddOns = () => client.get('/admin/shop/addons').then((r) => r.data);
export const createAddOn = (data) => client.post('/admin/shop/addons', data).then((r) => r.data);
export const updateAddOn = (id, data) => client.put(`/admin/shop/addons/${id}`, data).then((r) => r.data);

export const uploadLogo = (file) => {
  const fd = new FormData();
  fd.append('logo', file);
  return client.put('/admin/store/logo', fd).then((r) => r.data);
};
export const removeLogo = () => client.delete('/admin/store/logo').then((r) => r.data);