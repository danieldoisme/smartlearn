import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from './axios';

export function resolveAvatarUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (apiClient.defaults.baseURL || '').replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get('/me')).data,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await apiClient.patch('/me', payload)).data,
    onSuccess: (data) => {
      qc.setQueryData(['me'], data);
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post('/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['me'], data);
    },
  });
}

export function useDeleteAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.delete('/me/avatar')).data,
    onSuccess: (data) => {
      qc.setQueryData(['me'], data);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) =>
      (await apiClient.post('/me/password', {
        currentPassword,
        newPassword,
      })).data,
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: async () => (await apiClient.get('/me/preferences')).data,
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) =>
      (await apiClient.patch('/me/preferences', payload)).data,
    onSuccess: (data) => {
      qc.setQueryData(['me', 'preferences'], data);
    },
  });
}
