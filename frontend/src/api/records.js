import client from './client';

export const getInventoryReport = () => client.get('/admin/reports/inventory').then((r) => r.data);
export const getInstallationReport = (params) => client.get('/admin/reports/installations', { params }).then((r) => r.data);
export const getServiceReport = (params) => client.get('/admin/reports/service', { params }).then((r) => r.data);
export const downloadReportCsv = (kind, params) =>
  client.get(`/admin/reports/${kind}/export`, { params, responseType: 'blob' }).then((r) => r.data);

export const listCustomers = (params) => client.get('/admin/customers', { params }).then((r) => r.data);
export const getCustomer = (id) => client.get(`/admin/customers/${id}`).then((r) => r.data);