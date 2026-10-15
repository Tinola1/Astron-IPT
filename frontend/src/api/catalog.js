import client from './client';

// Drops empty filter values so they aren't sent as ?q=&brand=
const clean = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));

export const getProducts = (params) =>
  client.get('/products', { params: clean(params) }).then((r) => r.data);
export const getCategories = () => client.get('/categories').then((r) => r.data);
export const getBrands = () => client.get('/brands').then((r) => r.data);
export const getAddOns = () => client.get('/addons').then((r) => r.data);