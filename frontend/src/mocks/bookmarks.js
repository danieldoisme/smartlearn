/** @type {import('@/models/types').Bookmark[]} */
export const mockBookmarks = [
  { id: 1, userId: 1, questionId: 1, chapterId: 2, pageNumber: null, createdAt: '2026-03-14T08:00:00Z' },
  { id: 2, userId: 1, questionId: 2, chapterId: 3, pageNumber: null, createdAt: '2026-03-13T08:00:00Z' },
  { id: 3, userId: 1, questionId: 4, chapterId: 7, pageNumber: null, createdAt: '2026-03-11T08:00:00Z' },
  { id: 4, userId: 1, questionId: null, chapterId: null, pageNumber: 52, createdAt: '2026-03-15T08:00:00Z' },
  { id: 5, userId: 1, questionId: null, chapterId: null, pageNumber: 28, createdAt: '2026-03-12T08:00:00Z' },
  { id: 6, userId: 1, questionId: null, chapterId: null, pageNumber: 89, createdAt: '2026-03-09T08:00:00Z' },
]

/** @type {import('@/models/types').Note[]} */
export const mockNotes = [
  { id: 1, userId: 1, bookmarkId: 1, questionId: 1, content: 'Khóa chính không được NULL và giá trị phải duy nhất. Cần nhớ phân biệt với khóa ứng viên.', createdAt: '2026-03-14T08:05:00Z', updatedAt: '2026-03-15T10:00:00Z' },
  { id: 2, userId: 1, bookmarkId: 3, questionId: 4, content: 'ACID = Atomicity + Consistency + Isolation + Durability. Distribution KHÔNG phải tính chất ACID.', createdAt: '2026-03-11T08:10:00Z', updatedAt: '2026-03-11T08:10:00Z' },
  { id: 3, userId: 1, bookmarkId: 4, questionId: null, content: 'Phép kết tự nhiên (Natural Join) tự động ghép theo các thuộc tính cùng tên.', createdAt: '2026-03-15T08:10:00Z', updatedAt: '2026-03-15T08:10:00Z' },
  { id: 4, userId: 1, bookmarkId: null, questionId: null, content: 'Polymorphism: cùng 1 phương thức, hành vi khác nhau tùy đối tượng. Ví dụ: draw() cho Circle vs Rectangle.', createdAt: '2026-03-09T08:00:00Z', updatedAt: '2026-03-10T09:00:00Z' },
]
