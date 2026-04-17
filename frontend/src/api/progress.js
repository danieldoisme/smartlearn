import { useQuery } from '@tanstack/react-query';
import apiClient from './axios';

export function useWeekly() {
  return useQuery({
    queryKey: ['progress', 'weekly'],
    queryFn: async () => (await apiClient.get('/progress/weekly')).data,
  });
}

export function useAccuracyTrend() {
  return useQuery({
    queryKey: ['progress', 'accuracy-trend'],
    queryFn: async () => (await apiClient.get('/progress/accuracy-trend')).data,
  });
}

export function useDocumentsProgress() {
  return useQuery({
    queryKey: ['progress', 'documents'],
    queryFn: async () => (await apiClient.get('/progress/documents')).data,
  });
}
