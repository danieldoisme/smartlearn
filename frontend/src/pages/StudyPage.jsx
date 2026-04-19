import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  BookmarkPlus,
  BookOpen,
  FileText,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Bookmark,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { QuestionType, QuestionTypeLabel, SessionType } from '@/models'
import {
  useBookmarks,
  useCreateBookmark,
  useCreateNote,
  useDeleteBookmark,
} from '@/api/bookmarks'
import {
  useAvailableStudyChapters,
  useStartStudySession,
  useSubmitStudyAnswer,
  useCompleteStudySession,
} from '@/api/study'

function toMultiWire(labels) {
  return [...labels].sort().join(',')
}

function getChapterStatus(chapter) {
  if (!chapter?.questionCount) return 'empty'
  if (chapter.progress >= 100) return 'completed'
  if (chapter.answeredCount > 0) return 'in_progress'
  return 'not_started'
}

function getChapterStatusMeta(chapter) {
  const status = getChapterStatus(chapter)
  if (status === 'completed') return { label: 'Đã hoàn thành', variant: 'success' }
  if (status === 'in_progress') return { label: 'Đang học', variant: 'info' }
  if (status === 'empty') return { label: 'Chưa có câu hỏi', variant: 'warning' }
  return { label: 'Chưa học', variant: 'secondary' }
}

const statusFilters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'not_started', label: 'Chưa học' },
  { value: 'in_progress', label: 'Đang học' },
  { value: 'completed', label: 'Đã hoàn thành' },
]

function snapshotKey(sessionType, chapterId) {
  return `smartlearn.study.${sessionType}.${chapterId}`
}

function readSnapshot(sessionType, chapterId) {
  if (!chapterId) return null
  try {
    const raw = localStorage.getItem(snapshotKey(sessionType, chapterId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSnapshot(sessionType, chapterId, payload) {
  if (!chapterId) return
  try {
    localStorage.setItem(snapshotKey(sessionType, chapterId), JSON.stringify(payload))
  } catch {
    // storage quota / disabled — ignore
  }
}

function clearSnapshot(sessionType, chapterId) {
  if (!chapterId) return
  try {
    localStorage.removeItem(snapshotKey(sessionType, chapterId))
  } catch {
    // ignore
  }
}

function buildCitationHref(question) {
  if (!question?.documentId) return null
  const params = new URLSearchParams()
  if (question.chapterId) params.set('focusChapterId', String(question.chapterId))
  return `/document/${question.documentId}${params.toString() ? `?${params.toString()}` : ''}`
}

export default function StudyPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const chapterIdRaw = searchParams.get('chapterId')
  const chapterId = chapterIdRaw ? Number(chapterIdRaw) : null
  const mode = searchParams.get('mode')
  const sessionType =
    mode === SessionType.REVIEW ? SessionType.REVIEW : SessionType.LEARN
  const reviewQuestionIds = useMemo(() => {
    const raw = searchParams.get('questionIds')
    if (!raw) return []
    return [...new Set(raw.split(',').map((value) => Number(value)).filter(Number.isInteger))]
  }, [searchParams])

  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState({})
  const [fillAnswer, setFillAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [serverResult, setServerResult] = useState(null)
  const [showSource, setShowSource] = useState(false)
  const [showSourceContext, setShowSourceContext] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteMessage, setNoteMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: availableChapters = [], isLoading: availableLoading } =
    useAvailableStudyChapters()
  const { data: bookmarks = [] } = useBookmarks()
  const createBookmark = useCreateBookmark()
  const deleteBookmark = useDeleteBookmark()
  const createNote = useCreateNote()
  const startMut = useStartStudySession()
  const submitMut = useSubmitStudyAnswer(sessionId)
  const completeMut = useCompleteStudySession()

  const startStatus = startMut.status

  useEffect(() => {
    if (chapterId == null) return
    if (startStatus !== 'idle') return
    startMut.mutate(
      {
        chapterId,
        sessionType,
        questionIds:
          sessionType === SessionType.REVIEW ? reviewQuestionIds : undefined,
      },
      {
        onSuccess: (data) => {
          setSessionId(data.sessionId)
          setQuestions(data.questions || [])
          const snap = readSnapshot(sessionType, chapterId)
          if (snap && snap.sessionId === data.sessionId) {
            setCurrentQ(snap.currentQ || 0)
            setSelected(snap.selected || {})
            setFillAnswer(snap.fillAnswer || '')
            setSubmitted(Boolean(snap.submitted))
            setServerResult(snap.serverResult || null)
          }
        },
      },
    )
  }, [chapterId, reviewQuestionIds, sessionType, startStatus, startMut])

  useEffect(() => {
    if (!sessionId || chapterId == null) return
    writeSnapshot(sessionType, chapterId, {
      sessionId,
      currentQ,
      selected,
      fillAnswer,
      submitted,
      serverResult,
    })
  }, [sessionId, chapterId, sessionType, currentQ, selected, fillAnswer, submitted, serverResult])

  const question = questions[currentQ]
  const totalQ = questions.length
  const progressPct = totalQ ? ((currentQ + (submitted ? 1 : 0)) / totalQ) * 100 : 0
  const activeChapter = useMemo(
    () => availableChapters.find((chapter) => chapter.chapterId === chapterId) || null,
    [availableChapters, chapterId],
  )
  const filteredChapters = useMemo(() => {
    if (statusFilter === 'all') return availableChapters
    return availableChapters.filter((chapter) => getChapterStatus(chapter) === statusFilter)
  }, [availableChapters, statusFilter])
  const currentBookmark = question
    ? bookmarks.find((bookmark) => bookmark.questionId === question.id)
    : null
  const citationHref = question ? buildCitationHref(question) : null

  const correctLabelSet = useMemo(() => {
    if (!serverResult?.correctLabel) return new Set()
    return new Set(serverResult.correctLabel.split(',').map((s) => s.trim()))
  }, [serverResult])

  if (chapterId == null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {sessionType === SessionType.REVIEW ? 'Chọn chương để ôn tập' : 'Chọn chương để học'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {sessionType === SessionType.REVIEW
              ? 'Phiên ôn tập cần đúng chương và danh sách câu sai tương ứng.'
              : 'Chọn một chương đã có câu hỏi để bắt đầu hoặc tiếp tục phiên học.'}
          </p>
        </div>

        {availableLoading ? (
          <div className="py-16 text-center text-slate-500">
            Đang tải danh sách chương...
          </div>
        ) : sessionType === SessionType.REVIEW ? (
          <Card className="p-8">
            <CardContent className="text-center space-y-4">
              <Lightbulb className="h-10 w-10 text-amber-400 mx-auto" />
              <div className="space-y-1">
                <p className="text-slate-800 font-medium">
                  Hãy mở một nhóm câu sai từ trang ôn tập
                </p>
                <p className="text-sm text-slate-500">
                  Chọn tài liệu hoặc chương cần ôn tập để hệ thống tạo đúng phiên học.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Link to="/review">
                  <Button>Bắt đầu từ trang ôn tập</Button>
                </Link>
                <Link to="/study">
                  <Button variant="outline">Chuyển sang học thường</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : availableChapters.length === 0 ? (
          <Card className="p-8">
            <CardContent className="text-center space-y-4">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-slate-800 font-medium">
                  Chưa có chương nào sẵn sàng để học
                </p>
                <p className="text-sm text-slate-500">
                  Hãy tải tài liệu lên và tạo câu hỏi trước khi bắt đầu học tập.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Link to="/upload">
                  <Button>Tải tài liệu</Button>
                </Link>
                <Link to="/library">
                  <Button variant="outline">Về thư viện</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    statusFilter === filter.value
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {filteredChapters.length === 0 ? (
              <Card className="p-8">
                <CardContent className="text-center space-y-3">
                  <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-slate-800 font-medium">
                      Không có chương nào trong nhóm &ldquo;{statusFilters.find((filter) => filter.value === statusFilter)?.label}&rdquo;
                    </p>
                    <p className="text-sm text-slate-500">
                      Thử đổi bộ lọc để xem thêm chương khả dụng.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setStatusFilter('all')}>
                    Xem tất cả chương
                  </Button>
                </CardContent>
              </Card>
            ) : filteredChapters.map((chapter) => {
              const statusMeta = getChapterStatusMeta(chapter)
              return (
              <Card key={chapter.chapterId} className="p-4">
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 shrink-0">
                    <BookOpen className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {chapter.chapterTitle}
                      </p>
                      <Badge variant="secondary">{chapter.documentTitle}</Badge>
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{chapter.questionCount} câu hỏi</span>
                      <span>
                        {chapter.answeredCount}/{chapter.questionCount} đã làm
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={chapter.progress} className="flex-1 h-1.5" />
                      <span className="text-xs text-slate-500">
                        {chapter.progress}%
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => navigate(`/study?chapterId=${chapter.chapterId}`)}>
                    {chapter.answeredCount > 0 ? 'Tiếp tục học' : 'Bắt đầu học'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
              )
            })}
          </div>
        )}
      </motion.div>
    )
  }

  if (startMut.isPending || (!sessionId && !startMut.isError)) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-slate-500">
        Đang tải câu hỏi...
      </div>
    )
  }

  if (startMut.isError) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <p className="text-slate-600">Không thể bắt đầu phiên học.</p>
        <Button variant="outline" onClick={() => navigate('/library')}>
          Về thư viện
        </Button>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <p className="text-slate-600">Chương này chưa có câu hỏi.</p>
        <Button variant="outline" onClick={() => navigate('/library')}>
          Về thư viện
        </Button>
      </div>
    )
  }

  const handleSelect = (label) => {
    if (submitted) return
    if (question.questionType === QuestionType.MULTI) {
      setSelected((prev) => {
        const current = prev[question.id] || []
        return {
          ...prev,
          [question.id]: current.includes(label)
            ? current.filter((l) => l !== label)
            : [...current, label],
        }
      })
    } else {
      setSelected((prev) => ({ ...prev, [question.id]: label }))
    }
  }

  const buildSelectedAnswer = () => {
    if (question.questionType === QuestionType.FILL) return fillAnswer.trim() || null
    if (question.questionType === QuestionType.MULTI) {
      const labels = selected[question.id] || []
      return labels.length ? toMultiWire(labels) : null
    }
    return selected[question.id] || null
  }

  const handleSubmit = async () => {
    const selectedAnswer = buildSelectedAnswer()
    if (!selectedAnswer) return
    try {
      const res = await submitMut.mutateAsync({
        questionId: question.id,
        selectedAnswer,
        isSkipped: false,
      })
      setServerResult(res)
      setSubmitted(true)
    } catch {
      // Leave state unchanged; user can retry
    }
  }

  const userIsCorrect = () => serverResult?.isCorrect === true

  const optionIsCorrect = (opt) => {
    if (!submitted || !serverResult) return null
    return correctLabelSet.has(opt.label)
  }

  const resetForNext = () => {
    setSubmitted(false)
    setShowSource(false)
    setShowSourceContext(false)
    setFillAnswer('')
    setServerResult(null)
    setNoteContent('')
    setNoteMessage('')
  }

  const goNext = async () => {
    if (currentQ < totalQ - 1) {
      setCurrentQ(currentQ + 1)
      resetForNext()
    } else {
      if (sessionId) {
        try {
          await completeMut.mutateAsync(sessionId)
        } catch {
          // ignore completion error — still navigate
        }
      }
      clearSnapshot(sessionType, chapterId)
      navigate(sessionType === SessionType.REVIEW ? '/review' : '/progress')
    }
  }

  const goPrev = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1)
      resetForNext()
    }
  }

  const toggleBookmark = async () => {
    if (!question) return
    if (currentBookmark) {
      await deleteBookmark.mutateAsync(currentBookmark.id)
      return
    }
    await createBookmark.mutateAsync({ questionId: question.id })
  }

  const saveNote = async () => {
    if (!question || !noteContent.trim()) return
    try {
      await createNote.mutateAsync({
        questionId: question.id,
        content: noteContent.trim(),
      })
      setNoteContent('')
      setNoteMessage('Đã lưu ghi chú.')
    } catch {
      setNoteMessage('Không thể lưu ghi chú.')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <BookOpen className="h-4 w-4" />
            <span>{activeChapter?.chapterTitle || `Chương ${question.chapterId}`}</span>
            {activeChapter?.documentTitle && (
              <>
                <span>·</span>
                <span>{activeChapter.documentTitle}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-800">Câu {currentQ + 1}/{totalQ}</span>
            {sessionType === SessionType.REVIEW && (
              <Badge variant="info">Ôn tập câu sai</Badge>
            )}
            {question.documentTitle && (
              <Badge variant="secondary">{question.documentTitle}</Badge>
            )}
            <Badge variant={question.questionType === QuestionType.MCQ ? 'default' : question.questionType === QuestionType.MULTI ? 'info' : 'warning'}>
              {QuestionTypeLabel[question.questionType]}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleBookmark}
          disabled={createBookmark.isPending || deleteBookmark.isPending}
        >
          {currentBookmark ? (
            <Bookmark className="h-5 w-5 text-primary-500 fill-primary-500" />
          ) : (
            <BookmarkPlus className="h-5 w-5" />
          )}
        </Button>
      </div>

      <Progress value={progressPct} className="h-1.5" />

      <Card className="p-6">
        <CardContent className="space-y-5">
          <p className="text-base text-slate-800 font-medium leading-relaxed vn-text">{question.content}</p>

          {(question.questionType === QuestionType.MCQ || question.questionType === QuestionType.MULTI) && (
            <div className="space-y-2">
              {question.options.map((opt) => {
                const isSelected = question.questionType === QuestionType.MULTI
                  ? (selected[question.id] || []).includes(opt.label)
                  : selected[question.id] === opt.label
                const correct = optionIsCorrect(opt)

                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelect(opt.label)}
                    disabled={submitted}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm transition-all cursor-pointer ${
                      submitted
                        ? correct
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : isSelected
                            ? 'bg-red-50 border border-red-200 text-red-800'
                            : 'bg-slate-50 border border-slate-100 text-slate-500'
                        : isSelected
                          ? 'bg-primary-50 border border-primary-200 text-primary-800'
                          : 'bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
                      submitted
                        ? correct
                          ? 'bg-emerald-100 text-emerald-700'
                          : isSelected ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'
                        : isSelected ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {opt.label}
                    </span>
                    <span className="flex-1 vn-text">{opt.content}</span>
                    {submitted && correct && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                    {submitted && isSelected && !correct && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}

          {question.questionType === QuestionType.FILL && (
            <div className="space-y-2">
              <input
                id="answer-input"
                name="answer-input"
                type="text"
                value={fillAnswer}
                onChange={(e) => setFillAnswer(e.target.value)}
                disabled={submitted}
                placeholder="Nhập đáp án..."
                className="glass-input w-full h-11 px-4 text-sm text-slate-800 placeholder:text-slate-400"
              />
              {submitted && (
                <p className={`text-sm ${userIsCorrect() ? 'text-emerald-600' : 'text-red-600'}`}>
                  {userIsCorrect() ? '✓ Chính xác!' : `✗ Đáp án đúng: ${serverResult?.correctAnswer ?? ''}`}
                </p>
              )}
            </div>
          )}

          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl ${userIsCorrect() ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {userIsCorrect() ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${userIsCorrect() ? 'text-emerald-700' : 'text-red-700'}`}>
                  {userIsCorrect() ? 'Chính xác!' : 'Chưa đúng'}
                </span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {submitted && (question.sourcePage || question.sourceText) && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <button
              onClick={() => setShowSource(!showSource)}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 mb-2 cursor-pointer"
            >
              <Lightbulb className="h-4 w-4" />
              {showSource ? 'Ẩn nguồn trích dẫn' : 'Xem nguồn trích dẫn'}
            </button>
            {showSource && (
              <Card className="p-4">
                <CardContent>
                  {question.sourcePage && (
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="text-xs text-slate-500">Trang {question.sourcePage}</span>
                    </div>
                  )}
                  {question.sourceText && (
                    <p className="text-sm text-slate-600 leading-relaxed vn-text italic">
                      &ldquo;{question.sourceText}&rdquo;
                    </p>
                  )}
                  {(question.documentTitle || question.chapterTitle) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {question.documentTitle && <Badge variant="secondary">{question.documentTitle}</Badge>}
                      {question.chapterTitle && <span>Chương: {question.chapterTitle}</span>}
                    </div>
                  )}
                  {question.sourceContext && question.sourceContext !== question.sourceText && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowSourceContext((prev) => !prev)}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 cursor-pointer"
                      >
                        {showSourceContext ? 'Ẩn ngữ cảnh mở rộng' : 'Xem thêm ngữ cảnh'}
                      </button>
                      {showSourceContext && (
                        <p className="text-sm text-slate-500 leading-relaxed vn-text">
                          {question.sourceContext}
                        </p>
                      )}
                    </div>
                  )}
                  {citationHref && (
                    <Link to={citationHref} className="inline-block mt-3">
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4" />
                        Mở trong tài liệu
                      </Button>
                    </Link>
                  )}
                  <div className="mt-3 space-y-2">
                    <Input
                      id="note-input"
                      name="note-input"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Ghi chú nhanh cho câu hỏi này..."
                    />
                    <div className="flex items-center justify-between gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={saveNote}
                        disabled={!noteContent.trim() || createNote.isPending}
                      >
                        {createNote.isPending ? 'Đang lưu...' : 'Lưu ghi chú'}
                      </Button>
                      {noteMessage && (
                        <span className="text-xs text-slate-500">{noteMessage}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={goPrev} disabled={currentQ === 0}>
          <ChevronLeft className="h-4 w-4" />
          Câu trước
        </Button>
        <div className="flex gap-2">
          {!submitted ? (
            <>
              <Button variant="outline" onClick={goNext}>
                <SkipForward className="h-4 w-4" />
                Bỏ qua
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitMut.isPending || (!selected[question.id] && !fillAnswer)}
              >
                {submitMut.isPending ? 'Đang gửi...' : 'Xác nhận'}
              </Button>
            </>
          ) : (
            <Button onClick={goNext} disabled={completeMut.isPending}>
              {currentQ < totalQ - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
