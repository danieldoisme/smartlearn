import { useQuery } from '@tanstack/react-query';
import apiClient from './axios';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => (await apiClient.get('/dashboard/summary')).data,
  });
}
