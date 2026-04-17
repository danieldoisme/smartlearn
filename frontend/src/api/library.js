import { useQuery } from '@tanstack/react-query';
import apiClient from './axios';

export function useTopics() {
  return useQuery({
    queryKey: ['topics'],
    queryFn: async () => (await apiClient.get('/topics')).data,
  });
}

export function useDocuments(topicId) {
  return useQuery({
    queryKey: ['documents', topicId ?? 'all'],
    queryFn: async () => {
      const params = {};
      if (topicId) params.topic_id = topicId;
      return (await apiClient.get('/documents', { params })).data;
    },
  });
}
