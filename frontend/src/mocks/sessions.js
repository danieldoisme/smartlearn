import { SessionType } from '@/models/enums'

/** @type {import('@/models/types').StudySession[]} */
export const mockStudySessions = [
  { id: 1, userId: 1, chapterId: 1, sessionType: SessionType.LEARN, totalQuestions: 8, correctCount: 7, startedAt: '2026-03-10T08:00:00Z', completedAt: '2026-03-10T08:30:00Z' },
  { id: 2, userId: 1, chapterId: 2, sessionType: SessionType.LEARN, totalQuestions: 10, correctCount: 7, startedAt: '2026-03-11T09:00:00Z', completedAt: '2026-03-11T09:45:00Z' },
  { id: 3, userId: 1, chapterId: 3, sessionType: SessionType.LEARN, totalQuestions: 12, correctCount: 6, startedAt: '2026-03-12T10:00:00Z', completedAt: null },
]

/** @type {import('@/models/types').UserAnswer[]} */
export const mockUserAnswers = [
  { id: 1, sessionId: 3, questionId: 1, userId: 1, selectedAnswer: 'B', isCorrect: true, isSkipped: false, answeredAt: '2026-03-12T10:02:00Z' },
  { id: 2, sessionId: 3, questionId: 2, userId: 1, selectedAnswer: 'C', isCorrect: true, isSkipped: false, answeredAt: '2026-03-12T10:05:00Z' },
  { id: 3, sessionId: 3, questionId: 3, userId: 1, selectedAnswer: 'bắc cầu', isCorrect: true, isSkipped: false, answeredAt: '2026-03-12T10:08:00Z' },
  { id: 4, sessionId: 3, questionId: 4, userId: 1, selectedAnswer: 'A,B,C,E', isCorrect: true, isSkipped: false, answeredAt: '2026-03-12T10:12:00Z' },
]
