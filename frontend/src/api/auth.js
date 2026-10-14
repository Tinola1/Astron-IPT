import client from './client';

export const registerUser = (data) => client.post('/auth/register', data).then((r) => r.data);
export const loginUser = (data) => client.post('/auth/login', data).then((r) => r.data);
export const logoutUser = () => client.post('/auth/logout').then((r) => r.data);
export const fetchMe = () => client.get('/auth/me').then((r) => r.data);
export const forgotPassword = (email) =>
  client.post('/auth/forgot-password', { email }).then((r) => r.data);
export const resetPassword = (token, password) =>
  client.put(`/auth/reset-password/${token}`, { password }).then((r) => r.data);