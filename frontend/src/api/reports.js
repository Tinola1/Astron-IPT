import client from './client';

export const getDashboard = () => client.get('/admin/dashboard').then((r) => r.data);
export const getSalesReport = (params) => client.get('/admin/reports/sales', { params }).then((r) => r.data);
export const downloadSalesCsv = (params) =>
  client.get('/admin/reports/sales/export', { params, responseType: 'blob' }).then((r) => r.data);