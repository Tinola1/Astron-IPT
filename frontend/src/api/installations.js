import client from './client';

export const listInstallations = (params) => client.get('/installations', { params }).then((r) => r.data);
export const listTechnicians = () => client.get('/installations/technicians').then((r) => r.data);
export const scheduleInstallation = (id, data) => client.put(`/installations/${id}/schedule`, data).then((r) => r.data);
export const fetchMyJobs = () => client.get('/installations/mine').then((r) => r.data);
export const updateJobStatus = (id, data) => client.put(`/installations/${id}/status`, data).then((r) => r.data);