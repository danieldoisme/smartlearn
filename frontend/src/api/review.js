import { useQuery } from '@tanstack/react-query';
import apiClient from './axios';

export function useWrongQuestions() {
  return useQuery({
    queryKey: ['review', 'wrong-questions'],
    queryFn: async () => (await apiClient.get('/review/wrong-questions')).data,
  });
}
