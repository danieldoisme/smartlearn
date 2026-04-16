import { FileType } from '@/models/enums'

/** @type {import('@/models/types').Topic[]} */
export const mockTopics = [
  { id: 1, userId: 1, name: 'CSDL', createdAt: '2026-02-01T08:00:00Z' },
  { id: 2, userId: 1, name: 'OOP', createdAt: '2026-02-05T08:00:00Z' },
  { id: 3, userId: 1, name: 'Network', createdAt: '2026-02-10T08:00:00Z' },
  { id: 4, userId: 1, name: 'DSA', createdAt: '2026-02-15T08:00:00Z' },
  { id: 5, userId: 1, name: 'OS', createdAt: '2026-02-20T08:00:00Z' },
  { id: 6, userId: 1, name: 'AI', createdAt: '2026-02-25T08:00:00Z' },
]

/** @type {import('@/models/types').Document[]} */
export const mockDocuments = [
  { id: 1, userId: 1, topicId: 1, title: 'Giáo trình Cơ sở dữ liệu', filePath: '/uploads/csdl.pdf', fileType: FileType.PDF, fileSize: 4404019, createdAt: '2026-03-12T00:00:00Z', updatedAt: '2026-03-12T00:00:00Z' },
  { id: 2, userId: 1, topicId: 2, title: 'Lập trình hướng đối tượng', filePath: '/uploads/oop.pdf', fileType: FileType.PDF, fileSize: 7130317, createdAt: '2026-03-08T00:00:00Z', updatedAt: '2026-03-08T00:00:00Z' },
  { id: 3, userId: 1, topicId: 3, title: 'Mạng máy tính', filePath: '/uploads/network.docx', fileType: FileType.DOCX, fileSize: 3250586, createdAt: '2026-03-05T00:00:00Z', updatedAt: '2026-03-05T00:00:00Z' },
  { id: 4, userId: 1, topicId: 4, title: 'Cấu trúc dữ liệu và giải thuật', filePath: '/uploads/dsa.pdf', fileType: FileType.PDF, fileSize: 5767168, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
  { id: 5, userId: 1, topicId: 5, title: 'Hệ điều hành', filePath: '/uploads/os.pdf', fileType: FileType.PDF, fileSize: 7549747, createdAt: '2026-02-25T00:00:00Z', updatedAt: '2026-02-25T00:00:00Z' },
  { id: 6, userId: 1, topicId: 6, title: 'Trí tuệ nhân tạo', filePath: '/uploads/ai.pdf', fileType: FileType.PDF, fileSize: 5138022, createdAt: '2026-02-20T00:00:00Z', updatedAt: '2026-02-20T00:00:00Z' },
]

/** @type {import('@/models/types').Chapter[]} */
export const mockChapters = [
  { id: 1, documentId: 1, title: 'Chương 1: Tổng quan về CSDL', orderIndex: 1, contentText: '', pageStart: 1, pageEnd: 18 },
  { id: 2, documentId: 1, title: 'Chương 2: Mô hình quan hệ', orderIndex: 2, contentText: '', pageStart: 19, pageEnd: 42 },
  { id: 3, documentId: 1, title: 'Chương 3: Đại số quan hệ', orderIndex: 3, contentText: '', pageStart: 43, pageEnd: 68 },
  { id: 4, documentId: 1, title: 'Chương 4: Ngôn ngữ SQL', orderIndex: 4, contentText: '', pageStart: 69, pageEnd: 95 },
  { id: 5, documentId: 1, title: 'Chương 5: Chuẩn hóa CSDL', orderIndex: 5, contentText: '', pageStart: 96, pageEnd: 120 },
  { id: 6, documentId: 1, title: 'Chương 6: Thiết kế CSDL', orderIndex: 6, contentText: '', pageStart: 121, pageEnd: 145 },
  { id: 7, documentId: 1, title: 'Chương 7: Giao dịch & Khóa', orderIndex: 7, contentText: '', pageStart: 146, pageEnd: 168 },
  { id: 8, documentId: 1, title: 'Chương 8: Bảo mật & Phân quyền', orderIndex: 8, contentText: '', pageStart: 169, pageEnd: 190 },
]

/**
 * Helper: resolve topic name from topicId.
 * @param {number|null} topicId
 * @returns {string}
 */
export function getTopicName(topicId) {
  return mockTopics.find((t) => t.id === topicId)?.name ?? ''
}

/**
 * Helper: format file size from bytes to human-readable.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
