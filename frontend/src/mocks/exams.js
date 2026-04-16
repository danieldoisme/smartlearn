/** @type {import('@/models/types').Exam} */
export const mockExam = {
  id: 1,
  userId: 1,
  timeLimitMinutes: 30,
  totalQuestions: 10,
  correctCount: 7,
  score: 70.00,
  startedAt: '2026-03-12T14:00:00Z',
  completedAt: '2026-03-12T14:18:42Z',
  isPaused: false,
}

/** @type {import('@/models/types').ExamQuestion[]} */
export const mockExamResults = [
  { id: 1, examId: 1, questionId: 5, orderIndex: 1, selectedAnswer: 'B', isCorrect: true },
  { id: 2, examId: 1, questionId: 6, orderIndex: 2, selectedAnswer: 'C', isCorrect: true },
  { id: 3, examId: 1, questionId: 7, orderIndex: 3, selectedAnswer: 'A', isCorrect: false },
  { id: 4, examId: 1, questionId: 8, orderIndex: 4, selectedAnswer: 'C', isCorrect: true },
  { id: 5, examId: 1, questionId: 9, orderIndex: 5, selectedAnswer: 'B', isCorrect: true },
  { id: 6, examId: 1, questionId: 10, orderIndex: 6, selectedAnswer: 'C', isCorrect: true },
  { id: 7, examId: 1, questionId: 11, orderIndex: 7, selectedAnswer: 'B', isCorrect: false },
  { id: 8, examId: 1, questionId: 12, orderIndex: 8, selectedAnswer: 'B', isCorrect: true },
  { id: 9, examId: 1, questionId: 13, orderIndex: 9, selectedAnswer: 'B', isCorrect: true },
  { id: 10, examId: 1, questionId: 14, orderIndex: 10, selectedAnswer: null, isCorrect: false },
]
