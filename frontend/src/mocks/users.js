import { QuestionType, DisplayMode } from '@/models/enums'

/** @type {import('@/models/types').User} */
export const mockUser = {
  id: 1,
  fullName: 'Đức Thành',
  email: 'thanh.duc@example.com',
  passwordHash: '', // not exposed to frontend
  avatarUrl: null,
  emailVerified: true,
  createdAt: '2026-01-15T08:00:00Z',
  updatedAt: '2026-03-10T14:30:00Z',
}

/** @type {import('@/models/types').UserPreference} */
export const mockUserPreference = {
  id: 1,
  userId: 1,
  defaultQuestionCount: 10,
  preferredQuestionType: QuestionType.MCQ,
  answerDisplayMode: DisplayMode.IMMEDIATE,
}
