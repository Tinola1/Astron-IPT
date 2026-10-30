import client from './client';

// customer
export const fetchWarranties = () => client.get('/after-sales/warranties').then((r) => r.data);
export const fetchMyRequests = () => client.get('/after-sales/service-requests').then((r) => r.data);
export const createServiceRequest = (data) => client.post('/after-sales/service-requests', data).then((r) => r.data);

// admin and staff
export const listServiceRequests = (params) => client.get('/admin/service-requests', { params }).then((r) => r.data);
export const updateServiceRequest = (id, data) => client.put(`/admin/service-requests/${id}`, data).then((r) => r.data);
export const runMaintenanceReminders = () => client.post('/admin/service-requests/maintenance/run').then((r) => r.data);