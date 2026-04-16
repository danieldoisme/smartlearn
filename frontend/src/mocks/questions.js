import { QuestionType } from '@/models/enums'

/**
 * Study questions (for StudyPage) — matches Question + QuestionOption models.
 * @type {(import('@/models/types').Question & { options?: import('@/models/types').QuestionOption[] })[]}
 */
export const mockStudyQuestions = [
  {
    id: 1,
    chapterId: 3,
    questionType: QuestionType.MCQ,
    content: 'Trong mô hình quan hệ, khóa chính (Primary Key) có đặc điểm nào sau đây?',
    correctAnswer: null,
    sourceText: 'Khóa chính (Primary Key) là một hoặc tập hợp các thuộc tính mà giá trị của nó xác định duy nhất mỗi bộ trong quan hệ. Khóa chính không được chứa giá trị NULL.',
    sourcePage: 45,
    createdAt: '2026-03-12T10:00:00Z',
    options: [
      { id: 1, questionId: 1, label: 'A', content: 'Có thể chứa giá trị NULL', isCorrect: false },
      { id: 2, questionId: 1, label: 'B', content: 'Giá trị phải là duy nhất và không NULL', isCorrect: true },
      { id: 3, questionId: 1, label: 'C', content: 'Mỗi bảng có thể có nhiều khóa chính', isCorrect: false },
      { id: 4, questionId: 1, label: 'D', content: 'Khóa chính luôn là kiểu số nguyên', isCorrect: false },
    ],
  },
  {
    id: 2,
    chapterId: 3,
    questionType: QuestionType.MCQ,
    content: 'Phép toán nào trong đại số quan hệ dùng để kết hợp các bộ từ hai quan hệ dựa trên điều kiện?',
    correctAnswer: null,
    sourceText: 'Phép kết (Join) là phép toán kết hợp các bộ từ hai quan hệ thành một quan hệ mới, dựa trên một điều kiện kết nối giữa các thuộc tính.',
    sourcePage: 52,
    createdAt: '2026-03-12T10:05:00Z',
    options: [
      { id: 5, questionId: 2, label: 'A', content: 'Phép chiếu (Projection)', isCorrect: false },
      { id: 6, questionId: 2, label: 'B', content: 'Phép chọn (Selection)', isCorrect: false },
      { id: 7, questionId: 2, label: 'C', content: 'Phép kết (Join)', isCorrect: true },
      { id: 8, questionId: 2, label: 'D', content: 'Phép hợp (Union)', isCorrect: false },
    ],
  },
  {
    id: 3,
    chapterId: 3,
    questionType: QuestionType.FILL,
    content: 'Chuẩn hóa cơ sở dữ liệu đến dạng chuẩn 3NF nhằm loại bỏ phụ thuộc _______.',
    correctAnswer: 'bắc cầu',
    sourceText: 'Dạng chuẩn 3 (3NF) yêu cầu quan hệ phải ở 2NF và không có thuộc tính không khóa nào phụ thuộc bắc cầu vào khóa chính.',
    sourcePage: 78,
    createdAt: '2026-03-12T10:10:00Z',
    options: [],
  },
  {
    id: 4,
    chapterId: 3,
    questionType: QuestionType.MULTI,
    content: 'Chọn các đặc tính của giao dịch (Transaction) trong CSDL — tính chất ACID:',
    correctAnswer: null,
    sourceText: 'ACID là tập hợp các tính chất đảm bảo giao dịch CSDL được xử lý tin cậy: Atomicity, Consistency, Isolation, Durability.',
    sourcePage: 102,
    createdAt: '2026-03-12T10:15:00Z',
    options: [
      { id: 9, questionId: 4, label: 'A', content: 'Atomicity (Tính nguyên tử)', isCorrect: true },
      { id: 10, questionId: 4, label: 'B', content: 'Consistency (Tính nhất quán)', isCorrect: true },
      { id: 11, questionId: 4, label: 'C', content: 'Isolation (Tính cô lập)', isCorrect: true },
      { id: 12, questionId: 4, label: 'D', content: 'Distribution (Tính phân tán)', isCorrect: false },
      { id: 13, questionId: 4, label: 'E', content: 'Durability (Tính bền vững)', isCorrect: true },
    ],
  },
]

/**
 * Exam questions — matches Question + QuestionOption models (for ExamPage).
 * @type {(import('@/models/types').Question & { options: import('@/models/types').QuestionOption[] })[]}
 */
export const mockExamQuestions = [
  { id: 5, chapterId: 4, questionType: QuestionType.MCQ, content: 'Trong SQL, lệnh nào dùng để tạo bảng mới?', correctAnswer: null, sourceText: null, sourcePage: 23, createdAt: '2026-03-12T11:00:00Z',
    options: [
      { id: 14, questionId: 5, label: 'A', content: 'INSERT TABLE', isCorrect: false },
      { id: 15, questionId: 5, label: 'B', content: 'CREATE TABLE', isCorrect: true },
      { id: 16, questionId: 5, label: 'C', content: 'NEW TABLE', isCorrect: false },
      { id: 17, questionId: 5, label: 'D', content: 'ADD TABLE', isCorrect: false },
    ] },
  { id: 6, chapterId: 2, questionType: QuestionType.MCQ, content: 'Khóa ngoại (Foreign Key) dùng để làm gì?', correctAnswer: null, sourceText: null, sourcePage: 31, createdAt: '2026-03-12T11:01:00Z',
    options: [
      { id: 18, questionId: 6, label: 'A', content: 'Mã hóa dữ liệu', isCorrect: false },
      { id: 19, questionId: 6, label: 'B', content: 'Tạo chỉ mục', isCorrect: false },
      { id: 20, questionId: 6, label: 'C', content: 'Liên kết hai bảng', isCorrect: true },
      { id: 21, questionId: 6, label: 'D', content: 'Xóa dữ liệu', isCorrect: false },
    ] },
  { id: 7, chapterId: 5, questionType: QuestionType.MCQ, content: 'Dạng chuẩn 1NF yêu cầu điều gì?', correctAnswer: null, sourceText: null, sourcePage: 56, createdAt: '2026-03-12T11:02:00Z',
    options: [
      { id: 22, questionId: 7, label: 'A', content: 'Không có phụ thuộc bắc cầu', isCorrect: false },
      { id: 23, questionId: 7, label: 'B', content: 'Mỗi ô chứa giá trị nguyên tử', isCorrect: true },
      { id: 24, questionId: 7, label: 'C', content: 'Phải có khóa ngoại', isCorrect: false },
      { id: 25, questionId: 7, label: 'D', content: 'Tối thiểu 3 cột', isCorrect: false },
    ] },
  { id: 8, chapterId: 4, questionType: QuestionType.MCQ, content: 'Lệnh SQL nào dùng để xóa tất cả dữ liệu nhưng giữ cấu trúc bảng?', correctAnswer: null, sourceText: null, sourcePage: 40, createdAt: '2026-03-12T11:03:00Z',
    options: [
      { id: 26, questionId: 8, label: 'A', content: 'DELETE TABLE', isCorrect: false },
      { id: 27, questionId: 8, label: 'B', content: 'DROP TABLE', isCorrect: false },
      { id: 28, questionId: 8, label: 'C', content: 'TRUNCATE TABLE', isCorrect: true },
      { id: 29, questionId: 8, label: 'D', content: 'REMOVE TABLE', isCorrect: false },
    ] },
  { id: 9, chapterId: 3, questionType: QuestionType.MCQ, content: 'Phép toán nào trả về các bộ có mặt ở cả hai quan hệ?', correctAnswer: null, sourceText: null, sourcePage: 48, createdAt: '2026-03-12T11:04:00Z',
    options: [
      { id: 30, questionId: 9, label: 'A', content: 'Phép hợp (Union)', isCorrect: false },
      { id: 31, questionId: 9, label: 'B', content: 'Phép giao (Intersect)', isCorrect: true },
      { id: 32, questionId: 9, label: 'C', content: 'Phép trừ (Except)', isCorrect: false },
      { id: 33, questionId: 9, label: 'D', content: 'Phép chia (Division)', isCorrect: false },
    ] },
  { id: 10, chapterId: 4, questionType: QuestionType.MCQ, content: 'Chỉ mục (Index) trong CSDL giúp tối ưu thao tác nào?', correctAnswer: null, sourceText: null, sourcePage: 89, createdAt: '2026-03-12T11:05:00Z',
    options: [
      { id: 34, questionId: 10, label: 'A', content: 'INSERT', isCorrect: false },
      { id: 35, questionId: 10, label: 'B', content: 'UPDATE', isCorrect: false },
      { id: 36, questionId: 10, label: 'C', content: 'SELECT', isCorrect: true },
      { id: 37, questionId: 10, label: 'D', content: 'DELETE', isCorrect: false },
    ] },
  { id: 11, chapterId: 2, questionType: QuestionType.MCQ, content: 'Ràng buộc NOT NULL thuộc loại ràng buộc nào?', correctAnswer: null, sourceText: null, sourcePage: 35, createdAt: '2026-03-12T11:06:00Z',
    options: [
      { id: 38, questionId: 11, label: 'A', content: 'Ràng buộc miền', isCorrect: true },
      { id: 39, questionId: 11, label: 'B', content: 'Ràng buộc khóa', isCorrect: false },
      { id: 40, questionId: 11, label: 'C', content: 'Ràng buộc tham chiếu', isCorrect: false },
      { id: 41, questionId: 11, label: 'D', content: 'Ràng buộc bảng', isCorrect: false },
    ] },
  { id: 12, chapterId: 7, questionType: QuestionType.MCQ, content: 'Trigger là gì?', correctAnswer: null, sourceText: null, sourcePage: 112, createdAt: '2026-03-12T11:07:00Z',
    options: [
      { id: 42, questionId: 12, label: 'A', content: 'Thủ tục lưu trữ thông thường', isCorrect: false },
      { id: 43, questionId: 12, label: 'B', content: 'Chương trình tự động khi có sự kiện', isCorrect: true },
      { id: 44, questionId: 12, label: 'C', content: 'Lệnh tạo bảng', isCorrect: false },
      { id: 45, questionId: 12, label: 'D', content: 'Kiểu dữ liệu đặc biệt', isCorrect: false },
    ] },
  { id: 13, chapterId: 4, questionType: QuestionType.MCQ, content: 'VIEW trong SQL là gì?', correctAnswer: null, sourceText: null, sourcePage: 95, createdAt: '2026-03-12T11:08:00Z',
    options: [
      { id: 46, questionId: 13, label: 'A', content: 'Bảng vật lý', isCorrect: false },
      { id: 47, questionId: 13, label: 'B', content: 'Bảng ảo dựa trên câu truy vấn', isCorrect: true },
      { id: 48, questionId: 13, label: 'C', content: 'Kiểu dữ liệu', isCorrect: false },
      { id: 49, questionId: 13, label: 'D', content: 'Chỉ mục đặc biệt', isCorrect: false },
    ] },
  { id: 14, chapterId: 7, questionType: QuestionType.MCQ, content: 'Deadlock xảy ra khi nào?', correctAnswer: null, sourceText: null, sourcePage: 130, createdAt: '2026-03-12T11:09:00Z',
    options: [
      { id: 50, questionId: 14, label: 'A', content: 'Bảng bị xóa', isCorrect: false },
      { id: 51, questionId: 14, label: 'B', content: 'Hai giao dịch chờ nhau mãi', isCorrect: true },
      { id: 52, questionId: 14, label: 'C', content: 'Server tắt', isCorrect: false },
      { id: 53, questionId: 14, label: 'D', content: 'Ổ đĩa đầy', isCorrect: false },
    ] },
]
