/**
 * JSDoc type definitions for all backend models.
 * Field names use camelCase (JS convention) mapping 1:1 to backend snake_case.
 *
 * These types match the SQLAlchemy models in backend/app/models/.
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} fullName
 * @property {string} email
 * @property {string} passwordHash
 * @property {string|null} avatarUrl
 * @property {boolean} emailVerified
 * @property {string} createdAt - ISO 8601 datetime
 * @property {string} updatedAt - ISO 8601 datetime
 */

/**
 * @typedef {Object} UserPreference
 * @property {number} id
 * @property {number} userId
 * @property {number} defaultQuestionCount
 * @property {'mcq'|'multi'|'fill'} preferredQuestionType
 * @property {'immediate'|'end'} answerDisplayMode
 */

/**
 * @typedef {Object} Topic
 * @property {number} id
 * @property {number} userId
 * @property {string} name
 * @property {string} createdAt - ISO 8601 datetime
 */

/**
 * @typedef {Object} Document
 * @property {number} id
 * @property {number} userId
 * @property {number|null} topicId
 * @property {string} title
 * @property {string} filePath
 * @property {'pdf'|'docx'} fileType
 * @property {number} fileSize - bytes
 * @property {string} createdAt - ISO 8601 datetime
 * @property {string} updatedAt - ISO 8601 datetime
 */

/**
 * @typedef {Object} Chapter
 * @property {number} id
 * @property {number} documentId
 * @property {string} title
 * @property {number} orderIndex
 * @property {string} contentText
 * @property {number|null} pageStart
 * @property {number|null} pageEnd
 */

/**
 * @typedef {Object} Question
 * @property {number} id
 * @property {number} chapterId
 * @property {'mcq'|'multi'|'fill'} questionType
 * @property {string} content
 * @property {string|null} correctAnswer
 * @property {string|null} sourceText
 * @property {number|null} sourcePage
 * @property {string} createdAt - ISO 8601 datetime
 */

/**
 * @typedef {Object} QuestionOption
 * @property {number} id
 * @property {number} questionId
 * @property {string} label - A, B, C, D
 * @property {string} content
 * @property {boolean} isCorrect
 */

/**
 * @typedef {Object} StudySession
 * @property {number} id
 * @property {number} userId
 * @property {number} chapterId
 * @property {'learn'|'review'} sessionType
 * @property {number} totalQuestions
 * @property {number} correctCount
 * @property {string} startedAt - ISO 8601 datetime
 * @property {string|null} completedAt - ISO 8601 datetime
 */

/**
 * @typedef {Object} UserAnswer
 * @property {number} id
 * @property {number} sessionId
 * @property {number} questionId
 * @property {number} userId
 * @property {string|null} selectedAnswer
 * @property {boolean} isCorrect
 * @property {boolean} isSkipped
 * @property {string} answeredAt - ISO 8601 datetime
 */

/**
 * @typedef {Object} Exam
 * @property {number} id
 * @property {number} userId
 * @property {number} timeLimitMinutes
 * @property {number} totalQuestions
 * @property {number|null} correctCount
 * @property {number|null} score - percentage (0-100)
 * @property {string} startedAt - ISO 8601 datetime
 * @property {string|null} completedAt - ISO 8601 datetime
 * @property {boolean} isPaused
 */

/**
 * @typedef {Object} ExamQuestion
 * @property {number} id
 * @property {number} examId
 * @property {number} questionId
 * @property {number} orderIndex
 * @property {string|null} selectedAnswer
 * @property {boolean|null} isCorrect
 */

/**
 * @typedef {Object} Bookmark
 * @property {number} id
 * @property {number} userId
 * @property {number|null} questionId
 * @property {number|null} chapterId
 * @property {number|null} pageNumber
 * @property {string} createdAt - ISO 8601 datetime
 */

/**
 * @typedef {Object} Note
 * @property {number} id
 * @property {number} userId
 * @property {number|null} bookmarkId
 * @property {number|null} questionId
 * @property {string} content
 * @property {string} createdAt - ISO 8601 datetime
 * @property {string} updatedAt - ISO 8601 datetime
 */
