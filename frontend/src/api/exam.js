import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from './axios';

export function useStartExam() {
  return useMutation({
    mutationFn: async ({
      chapterId = null,
      chapterIds = [],
      questionLimit = 10,
      timeLimitMinutes = 30,
      questionType = null,
      allowPartial = false,
    } = {}) => {
      const body = { questionLimit, timeLimitMinutes };
      if (chapterId != null) body.chapterId = chapterId;
      if (chapterIds?.length) body.chapterIds = chapterIds;
      if (questionType) body.questionType = questionType;
      if (allowPartial) body.allowPartial = true;
      return (await apiClient.post('/exams', body)).data;
    },
  });
}

export function useSubmitExam() {
  return useMutation({
    mutationFn: async ({ examId, answers }) =>
      (await apiClient.post(`/exams/${examId}/submit`, { answers })).data,
  });
}

export function useExamResult(examId) {
  return useQuery({
    queryKey: ['exam', 'result', examId],
    queryFn: async () => (await apiClient.get(`/exams/${examId}/result`)).data,
    enabled: Boolean(examId),
  });
}

export function useCurrentExam() {
  return useQuery({
    queryKey: ['exam', 'current'],
    queryFn: async () => (await apiClient.get('/exams/current')).data,
  });
}

export function useSaveExamProgress() {
  return useMutation({
    mutationFn: async ({ examId, answers, isPaused }) =>
      (await apiClient.patch(`/exams/${examId}/progress`, { answers, isPaused })).data,
  });
}
