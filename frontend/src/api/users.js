import client from './client';

export const listTeam = (params) => client.get('/admin/users', { params }).then((r) => r.data);
export const createTeamMember = (data) => client.post('/admin/users', data).then((r) => r.data);
export const updateTeamMember = (id, data) => client.put(`/admin/users/${id}`, data).then((r) => r.data);
export const resetTeamPassword = (id, password) => client.put(`/admin/users/${id}/password`, { password }).then((r) => r.data);