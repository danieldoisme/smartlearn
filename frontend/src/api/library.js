import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from './axios';

export function useTopics() {
  return useQuery({
    queryKey: ['topics'],
    queryFn: async () => (await apiClient.get('/topics')).data,
  });
}

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }) => (await apiClient.post('/topics', { name })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fileName,
      fileContentBase64,
      title,
      topicId,
      topicName,
      onUploadProgress,
    }) =>
      (
        await apiClient.post(
          '/documents',
          {
            fileName,
            fileContentBase64,
            title,
            topicId,
            topicName,
          },
          { onUploadProgress }
        )
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['topics'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useRenameDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }) =>
      (await apiClient.patch(`/documents/${id}`, { title })).data,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['document', variables.id] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/documents/${id}`);
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['document', id] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      qc.invalidateQueries({ queryKey: ['study', 'available-chapters'] });
      qc.invalidateQueries({ queryKey: ['bookmarks'] });
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
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
