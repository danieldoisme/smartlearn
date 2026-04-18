import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from './axios';

export function useDocumentDetail(documentId) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => (await apiClient.get(`/documents/${documentId}`)).data,
    enabled: Boolean(documentId),
  });
}

export function useGenerateQuestions(documentId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chapterId, questionType, count }) =>
      (
        await apiClient.post(`/chapters/${chapterId}/generate-questions`, {
          questionType,
          count,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', documentId] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      qc.invalidateQueries({ queryKey: ['study', 'available-chapters'] });
    },
  });
}

export function useUpdateDocumentStructure(documentId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chapters }) =>
      (await apiClient.put(`/documents/${documentId}/structure`, { chapters })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', documentId] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      qc.invalidateQueries({ queryKey: ['study', 'available-chapters'] });
    },
  });
}
