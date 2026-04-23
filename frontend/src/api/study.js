import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from './axios';

export function useAvailableStudyChapters() {
  return useQuery({
    queryKey: ['study', 'available-chapters'],
    queryFn: async () => (await apiClient.get('/study-sessions/available-chapters')).data,
  });
}

export function useStartStudySession() {
  return useMutation({
    mutationFn: async ({
      chapterId,
      sessionType = 'learn',
      questionLimit,
      questionIds,
      restart = false,
    }) => {
      const body = { chapterId, sessionType, restart };
      if (questionLimit != null) body.questionLimit = questionLimit;
      if (questionIds?.length) body.questionIds = questionIds;
      return (await apiClient.post('/study-sessions', body)).data;
    },
  });
}

export function useSubmitStudyAnswer(sessionId) {
  return useMutation({
    mutationFn: async ({ questionId, selectedAnswer = null, isSkipped = false }) => {
      return (
        await apiClient.post(`/study-sessions/${sessionId}/answers`, {
          questionId,
          selectedAnswer,
          isSkipped,
        })
      ).data;
    },
  });
}

export function useCompleteStudySession() {
  return useMutation({
    mutationFn: async (sessionId) =>
      (await apiClient.post(`/study-sessions/${sessionId}/complete`)).data,
  });
}
