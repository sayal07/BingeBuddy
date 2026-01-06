/**
 * Authentication service functions for BingeBuddy.
 */

import api from '../utils/api';

export const signup = (data) => api.post('/auth/signup/', data);
export const verifyOTP = (data) => api.post('/auth/verify-otp/', data);
export const resendOTP = (data) => api.post('/auth/resend-otp/', data);
export const login = (data) => api.post('/auth/login/', data);
export const logout = (refresh) => api.post('/auth/logout/', { refresh });
export const getProfile = () => api.get('/auth/profile/');
export const updateProfile = (data) => api.patch('/auth/profile/', data);
export const changePassword = (data) => api.post('/auth/change-password/', data);
