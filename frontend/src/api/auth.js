import { useMutation } from '@tanstack/react-query';
import apiClient from './axios';
import { useAuth } from '@/auth/AuthContext';

async function postLogin({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

async function postRegister({ email, password, fullName }) {
  const { data } = await apiClient.post('/auth/register', {
    email,
    password,
    fullName,
  });
  return data;
}

export function useLogin() {
  const { login } = useAuth();
  return useMutation({
    mutationFn: postLogin,
    onSuccess: (data) => {
      login(data.accessToken, data.user);
    },
  });
}

export function useRegister() {
  const { login } = useAuth();
  return useMutation({
    mutationFn: postRegister,
    onSuccess: (data) => {
      login(data.accessToken, data.user);
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async ({ email }) =>
      (await apiClient.post('/auth/password-reset/request', { email })).data,
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: async ({ token, newPassword }) => {
      await apiClient.post('/auth/password-reset/confirm', {
        token,
        newPassword,
      });
      return true;
    },
  });
}
