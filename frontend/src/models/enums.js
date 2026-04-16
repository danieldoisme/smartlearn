/**
 * Frontend enum constants — mirrors backend/app/models/enums.py exactly.
 */

export const QuestionType = Object.freeze({
  MCQ: 'mcq',
  MULTI: 'multi',
  FILL: 'fill',
})

export const DisplayMode = Object.freeze({
  IMMEDIATE: 'immediate',
  END: 'end',
})

export const FileType = Object.freeze({
  PDF: 'pdf',
  DOCX: 'docx',
})

export const SessionType = Object.freeze({
  LEARN: 'learn',
  REVIEW: 'review',
})

/** Vietnamese labels for question types */
export const QuestionTypeLabel = Object.freeze({
  [QuestionType.MCQ]: 'Trắc nghiệm',
  [QuestionType.MULTI]: 'Chọn nhiều',
  [QuestionType.FILL]: 'Điền từ',
})

/** Vietnamese labels for display modes */
export const DisplayModeLabel = Object.freeze({
  [DisplayMode.IMMEDIATE]: 'Hiển thị ngay',
  [DisplayMode.END]: 'Cuối phiên',
})
