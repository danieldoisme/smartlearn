import { useQuery } from '@tanstack/react-query';
import apiClient from './axios';

function buildRangeParams(range = {}) {
  const params = {};
  if (range.startDate) params.start_date = range.startDate;
  if (range.endDate) params.end_date = range.endDate;
  return params;
}

export function useWeekly(range) {
  return useQuery({
    queryKey: ['progress', 'weekly', range?.startDate ?? null, range?.endDate ?? null],
    queryFn: async () =>
      (await apiClient.get('/progress/weekly', { params: buildRangeParams(range) })).data,
  });
}

export function useAccuracyTrend(range) {
  return useQuery({
    queryKey: ['progress', 'accuracy-trend', range?.startDate ?? null, range?.endDate ?? null],
    queryFn: async () =>
      (await apiClient.get('/progress/accuracy-trend', { params: buildRangeParams(range) })).data,
  });
}

export function useDocumentsProgress(range) {
  return useQuery({
    queryKey: ['progress', 'documents', range?.startDate ?? null, range?.endDate ?? null],
    queryFn: async () =>
      (await apiClient.get('/progress/documents', { params: buildRangeParams(range) })).data,
  });
}

export function useDocumentProgressDetail(documentId, range, enabled = true) {
  return useQuery({
    queryKey: ['progress', 'documents', documentId, 'detail', range?.startDate ?? null, range?.endDate ?? null],
    queryFn: async () =>
      (
        await apiClient.get(`/progress/documents/${documentId}`, {
          params: buildRangeParams(range),
        })
      ).data,
    enabled: Boolean(documentId) && enabled,
  });
}
