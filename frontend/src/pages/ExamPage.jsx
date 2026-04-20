import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pause,
  Play,
  Send,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAvailableStudyChapters } from '@/api/study'
import {
  useCurrentExam,
  useSaveExamProgress,
  useStartExam,
  useSubmitExam,
} from '@/api/exam'
import { QuestionType, QuestionTypeLabel } from '@/models'

const DEFAULT_TIME_LIMIT = 30
const DEFAULT_QUESTION_LIMIT = 10
const QUESTION_TYPE_OPTIONS = [
  { value: 'mixed', label: 'Hỗn hợp' },
  { value: QuestionType.MCQ, label: QuestionTypeLabel[QuestionType.MCQ] },
  { value: QuestionType.MULTI, label: QuestionTypeLabel[QuestionType.MULTI] },
  { value: QuestionType.FILL, label: QuestionTypeLabel[QuestionType.FILL] },
]

function snapshotKey(examId) {
  return `smartlearn.exam.${examId}`
}

function readSnapshot(examId) {
  if (!examId) return null
  try {
    const raw = localStorage.getItem(snapshotKey(examId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSnapshot(examId, payload) {
  if (!examId) return
  localStorage.setItem(snapshotKey(examId), JSON.stringify(payload))
}

function clearSnapshot(examId) {
  if (!examId) return
  localStorage.removeItem(snapshotKey(examId))
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds)
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function toArrayAnswer(value) {
  if (!value) return []
  return String(value).split(',').map((item) => item.trim()).filter(Boolean)
}

function normalizeAnswerMap(value = {}) {
  return Object.fromEntries(
    Object.entries(value).map(([key, answer]) => [Number(key), answer ?? null])
  )
}

export default function ExamPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const chapterIdRaw = searchParams.get('chapterId')
  const presetChapterId = chapterIdRaw ? Number(chapterIdRaw) : null

  const [config, setConfig] = useState({
    questionLimit: DEFAULT_QUESTION_LIMIT,
    timeLimitMinutes: DEFAULT_TIME_LIMIT,
    questionType: 'mixed',
    selectedChapterIds: presetChapterId ? [presetChapterId] : [],
  })
  const [examId, setExamId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [currentQ, setCurrentQ] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_LIMIT * 60)
  const [isPaused, setIsPaused] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [configError, setConfigError] = useState('')
  const [partialPool, setPartialPool] = useState(null)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([])

  const { data: availableChapters = [], isLoading: chaptersLoading } =
    useAvailableStudyChapters()
  const { data: currentExam, isLoading: currentExamLoading } = useCurrentExam()
  const startMut = useStartExam()
  const submitMut = useSubmitExam()
  const saveProgress = useSaveExamProgress()

  const loadExamSession = useCallback((session) => {
    const snapshot = readSnapshot(session.examId)
    setExamId(session.examId)
    setQuestions(session.questions || [])
    setAnswers(snapshot?.answers || normalizeAnswerMap(session.answers))
    setCurrentQ(snapshot?.currentQ || 0)
    setTimeLeft(
      snapshot?.timeLeft ?? (session.timeLimitMinutes ?? DEFAULT_TIME_LIMIT) * 60
    )
    setIsPaused(Boolean(snapshot?.isPaused ?? session.isPaused))
  }, [])

  useEffect(() => {
    if (!currentExam) return
    if (examId) return
    const timer = setTimeout(() => {
      loadExamSession(currentExam)
    }, 0)
    return () => clearTimeout(timer)
  }, [currentExam, examId, loadExamSession])

  useEffect(() => {
    if (!examId) return
    writeSnapshot(examId, { answers, currentQ, timeLeft, isPaused })
  }, [answers, currentQ, examId, isPaused, timeLeft])

  useEffect(() => {
    if (!examId || isPaused) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [examId, isPaused])

  const submitExam = useCallback(async () => {
    if (!examId || submitMut.isPending) return
    await saveProgress.mutateAsync({ examId, answers, isPaused: false })
    await submitMut.mutateAsync({ examId, answers })
    clearSnapshot(examId)
    navigate(`/result?examId=${examId}`)
  }, [answers, examId, navigate, saveProgress, submitMut])

  useEffect(() => {
    if (timeLeft !== 0 || !examId || isPaused) return
    submitExam()
  }, [timeLeft, examId, isPaused, submitExam])

  const question = questions[currentQ]
  const answeredCount = Object.values(answers).filter(Boolean).length
  const isLowTime = timeLeft < 300

  const chapterGroups = useMemo(() => {
    const groups = new Map()
    for (const chapter of availableChapters) {
      const key = chapter.documentId
      if (!groups.has(key)) {
        groups.set(key, {
          documentId: chapter.documentId,
          documentTitle: chapter.documentTitle,
          chapters: [],
          questionCount: 0,
        })
      }
      const group = groups.get(key)
      group.chapters.push(chapter)
      group.questionCount += chapter.questionCount || 0
    }
    return [...groups.values()]
  }, [availableChapters])

  const [prevPresetChapterId, setPrevPresetChapterId] = useState(null)
  if (presetChapterId !== prevPresetChapterId && availableChapters.length > 0) {
    setPrevPresetChapterId(presetChapterId)
    const presetChapter = availableChapters.find((chapter) => chapter.chapterId === presetChapterId)
    if (presetChapter && !selectedDocumentIds.includes(presetChapter.documentId)) {
      setSelectedDocumentIds([...selectedDocumentIds, presetChapter.documentId])
    }
  }

  const visibleChapterGroups = useMemo(() => {
    if (selectedDocumentIds.length === 0) return []
    return chapterGroups.filter((group) => selectedDocumentIds.includes(group.documentId))
  }, [chapterGroups, selectedDocumentIds])

  const availableDocumentOptions = useMemo(() => (
    chapterGroups.filter((group) => !selectedDocumentIds.includes(group.documentId))
  ), [chapterGroups, selectedDocumentIds])

  const addDocument = (documentId) => {
    if (!documentId) return
    setSelectedDocumentIds((prev) => (
      prev.includes(documentId) ? prev : [...prev, documentId]
    ))
  }

  const removeDocument = (documentId) => {
    setSelectedDocumentIds((prev) => prev.filter((id) => id !== documentId))
    setConfig((current) => ({
      ...current,
      selectedChapterIds: current.selectedChapterIds.filter((chapterId) => {
        const chapter = availableChapters.find((item) => item.chapterId === chapterId)
        return chapter?.documentId !== documentId
      }),
    }))
  }

  const toggleChapter = (chapterId) => {
    setConfig((prev) => ({
      ...prev,
      selectedChapterIds: prev.selectedChapterIds.includes(chapterId)
        ? prev.selectedChapterIds.filter((id) => id !== chapterId)
        : [...prev.selectedChapterIds, chapterId],
    }))
  }

  const startExam = async (allowPartial = false) => {
    setConfigError('')
    try {
      const effectiveChapterIds = config.selectedChapterIds.length
        ? config.selectedChapterIds
        : selectedDocumentIds.length
          ? availableChapters
              .filter((chapter) => selectedDocumentIds.includes(chapter.documentId))
              .map((chapter) => chapter.chapterId)
          : []

      const data = await startMut.mutateAsync({
        chapterIds: effectiveChapterIds,
        questionLimit: config.questionLimit,
        timeLimitMinutes: config.timeLimitMinutes,
        questionType: config.questionType === 'mixed' ? null : config.questionType,
        allowPartial,
      })
      setPartialPool(null)
      loadExamSession(data)
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      if (status === 409 && detail && typeof detail === 'object' && detail.code === 'partial_pool') {
        setPartialPool({ available: detail.available, requested: detail.requested })
        return
      }
      setConfigError(
        typeof detail === 'string' ? detail : 'Không thể tạo bài kiểm tra.'
      )
    }
  }

  const togglePause = async () => {
    if (!examId) return
    const nextPaused = !isPaused
    setIsPaused(nextPaused)
    await saveProgress.mutateAsync({ examId, answers, isPaused: nextPaused })
  }

  const setAnswerForQuestion = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleOptionSelect = (optionLabel) => {
    if (!question) return
    if (question.questionType === QuestionType.MULTI) {
      const current = toArrayAnswer(answers[question.id])
      const next = current.includes(optionLabel)
        ? current.filter((label) => label !== optionLabel)
        : [...current, optionLabel]
      setAnswerForQuestion(question.id, next.length ? next.sort().join(',') : null)
      return
    }
    setAnswerForQuestion(question.id, optionLabel)
  }

  const renderQuestionBody = () => {
    if (!question) return null
    if (question.questionType === QuestionType.FILL) {
      return (
        <Input
          id={`question-input-${question.id}`}
          name={`question-input-${question.id}`}
          value={answers[question.id] || ''}
          onChange={(e) => setAnswerForQuestion(question.id, e.target.value)}
          placeholder="Nhập đáp án..."
          aria-labelledby={`question-text-${question.id}`}
        />
      )
    }

    const selectedLabels =
      question.questionType === QuestionType.MULTI
        ? toArrayAnswer(answers[question.id])
        : [answers[question.id]].filter(Boolean)

    return (
      <div className="space-y-2">
        {question.options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handleOptionSelect(opt.label)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm transition-all cursor-pointer ${
              selectedLabels.includes(opt.label)
                ? 'bg-primary-50 border border-primary-200 text-primary-800'
                : 'bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100 hover:border-slate-200'
            }`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-all ${
              question.questionType === QuestionType.MULTI
                ? 'rounded-md'
                : 'rounded-full'
            } ${
              selectedLabels.includes(opt.label)
                ? 'border-primary-500 bg-primary-100 text-primary-700'
                : 'border-slate-300 bg-white text-transparent'
            }`}>
              <span className={`block ${question.questionType === QuestionType.MULTI ? 'text-xs font-bold' : 'h-2.5 w-2.5 rounded-full bg-current'} ${selectedLabels.includes(opt.label) ? '' : 'opacity-0'}`}>
                {question.questionType === QuestionType.MULTI ? '✓' : ''}
              </span>
            </span>
            <span className="vn-text">{opt.content}</span>
          </button>
        ))}
      </div>
    )
  }

  const canStart = !chaptersLoading
  const hasExam = Boolean(examId && questions.length)

  if (!hasExam) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cấu hình bài kiểm tra</h1>
          <p className="text-slate-500 text-sm mt-1">
            Chọn chương, loại câu hỏi và thời gian trước khi bắt đầu.
          </p>
        </div>

        {currentExamLoading ? (
          <div className="py-16 text-center text-slate-500">Đang kiểm tra bài thi đang dở...</div>
        ) : null}

        <Card className="p-6">
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div id="documents-label" className="block text-sm font-medium text-slate-800">
                  Tài liệu tham gia đề thi
                </div>
                <span className="text-xs text-slate-500">
                  {selectedDocumentIds.length === 0
                    ? 'Đang dùng toàn bộ tài liệu'
                    : `${selectedDocumentIds.length} tài liệu đã chọn`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedDocumentIds([])
                  setConfig((prev) => ({ ...prev, selectedChapterIds: [] }))
                }}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
                  selectedDocumentIds.length === 0
                    ? 'bg-primary-50 text-primary-700 border-primary-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Toàn bộ tài liệu</p>
                    <p className="text-xs text-slate-500">Không cần chọn riêng từng tài liệu hoặc chương</p>
                  </div>
                  <Badge variant={selectedDocumentIds.length === 0 ? 'default' : 'secondary'}>
                    {chapterGroups.length} tài liệu
                  </Badge>
                </div>
              </button>

              {selectedDocumentIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {visibleChapterGroups.map((group) => (
                    <button
                      key={group.documentId}
                      type="button"
                      onClick={() => removeDocument(group.documentId)}
                      className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-all cursor-pointer hover:border-primary-300"
                    >
                      {group.documentTitle} · {group.chapters.length} chương ✕
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="exam-document-picker" className="block text-xs font-medium text-slate-600">
                  Thêm tài liệu vào đề thi
                </label>
                <select
                  id="exam-document-picker"
                  name="examDocumentPicker"
                  defaultValue=""
                  onChange={(e) => {
                    addDocument(Number(e.target.value))
                    e.target.value = ''
                  }}
                  disabled={selectedDocumentIds.length === 0 ? false : availableDocumentOptions.length === 0}
                  className="glass-input h-11 w-full rounded-xl px-4 text-sm text-slate-800"
                >
                  <option value="">{selectedDocumentIds.length === 0 ? 'Chọn tài liệu để giới hạn phạm vi (tuỳ chọn)' : availableDocumentOptions.length ? 'Thêm tài liệu...' : 'Đã thêm hết tài liệu'}</option>
                  {availableDocumentOptions.map((group) => (
                    <option key={group.documentId} value={group.documentId}>
                      {group.documentTitle} — {group.chapters.length} chương / {group.questionCount} câu hỏi
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Không chọn tài liệu nào = dùng toàn bộ. Chọn ít nhất 1 tài liệu để hiện danh sách chương tương ứng.
                </p>
              </div>

              {selectedDocumentIds.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div id="chapters-label" className="block text-sm font-medium text-slate-800">
                      Chương tham gia đề thi
                    </div>
                    <span className="text-xs text-slate-500">
                      {config.selectedChapterIds.length === 0
                        ? 'Mặc định lấy toàn bộ chương của tài liệu đã chọn'
                        : `${config.selectedChapterIds.length} chương đã chọn`}
                    </span>
                  </div>

                  <div className="space-y-3" role="group" aria-labelledby="chapters-label">
                    {visibleChapterGroups.map((group) => (
                      <Card key={group.documentId} className="p-4">
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{group.documentTitle}</p>
                            <p className="text-xs text-slate-500">
                              Chọn chương cụ thể hoặc để trống để lấy toàn bộ chương trong tài liệu này.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {group.chapters.map((chapter) => (
                              <button
                                key={chapter.chapterId}
                                type="button"
                                onClick={() => toggleChapter(chapter.chapterId)}
                                className={`rounded-lg border px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                                  config.selectedChapterIds.includes(chapter.chapterId)
                                    ? 'bg-primary-50 text-primary-700 border-primary-200'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="font-medium">{chapter.chapterTitle}</div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {chapter.questionCount} câu hỏi
                                </div>
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div id="question-type-label" className="block text-sm font-medium text-slate-800 mb-2">
                Loại câu hỏi
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="question-type-label">
                {QUESTION_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, questionType: option.value }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      config.questionType === option.value
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="questionLimit" className="block text-sm font-medium text-slate-800 mb-2">
                  Số lượng câu hỏi
                </label>
                <Input
                  id="questionLimit"
                  name="questionLimit"
                  type="number"
                  min="1"
                  max="100"
                  value={config.questionLimit}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      questionLimit: Number(e.target.value || DEFAULT_QUESTION_LIMIT),
                    }))
                  }
                />
              </div>
              <div>
                <label htmlFor="timeLimitMinutes" className="block text-sm font-medium text-slate-800 mb-2">
                  Thời gian (phút)
                </label>
                <Input
                  id="timeLimitMinutes"
                  name="timeLimitMinutes"
                  type="number"
                  min="1"
                  max="240"
                  value={config.timeLimitMinutes}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      timeLimitMinutes: Number(e.target.value || DEFAULT_TIME_LIMIT),
                    }))
                  }
                />
              </div>
            </div>

            {configError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {configError}
              </div>
            )}

            <Button onClick={() => startExam(false)} disabled={!canStart || startMut.isPending}>
              {startMut.isPending ? 'Đang tạo...' : 'Bắt đầu kiểm tra'}
            </Button>
          </CardContent>
        </Card>

        <Dialog open={!!partialPool} onOpenChange={(open) => !open && setPartialPool(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Không đủ câu hỏi</DialogTitle>
              <DialogDescription>
                {partialPool && (
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Chỉ có {partialPool.available}/{partialPool.requested} câu khả dụng.
                    Tiếp tục với {partialPool.available} câu?
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setPartialPool(null)}>Hủy</Button>
              <Button
                onClick={() => {
                  setPartialPool(null)
                  startExam(true)
                }}
                disabled={startMut.isPending}
              >
                Tiếp tục
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    )
  }

  if (!question) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <p className="text-slate-600">Không thể tải câu hỏi cho bài kiểm tra.</p>
        <Button variant="outline" onClick={() => navigate('/library')}>
          Về thư viện
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kiểm tra tổng hợp</h1>
          <p className="text-sm text-slate-500">
            {config.selectedChapterIds.length
              ? `${config.selectedChapterIds.length} chương`
              : 'Toàn bộ tài liệu'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isLowTime ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-200'}`}>
            <Clock className={`h-4 w-4 ${isLowTime ? 'text-red-500' : 'text-slate-400'}`} />
            <span className={`text-base font-mono font-bold ${isLowTime ? 'text-red-600' : 'text-slate-800'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={togglePause}>
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {isPaused ? (
            <Card className="p-16 text-center">
              <CardContent>
                <Pause className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-800 mb-2">Đã tạm dừng</p>
                <p className="text-sm text-slate-500 mb-4">Tiến độ đã được lưu trên trình duyệt này.</p>
                <Button onClick={togglePause}>
                  <Play className="h-4 w-4" />
                  Tiếp tục
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="p-6">
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Câu {currentQ + 1}/{questions.length}</Badge>
                    {answers[question.id] && <Badge variant="success">Đã trả lời</Badge>}
                    <Badge variant={question.questionType === QuestionType.MCQ ? 'default' : question.questionType === QuestionType.MULTI ? 'info' : 'warning'}>
                      {QuestionTypeLabel[question.questionType]}
                    </Badge>
                  </div>

                  <p id={`question-text-${question.id}`} className="text-base text-slate-800 font-medium leading-relaxed vn-text">{question.content}</p>
                  {renderQuestionBody()}
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
                  <ChevronLeft className="h-4 w-4" /> Câu trước
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
                  disabled={currentQ === questions.length - 1}
                >
                  Câu sau <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <CardContent>
              <p className="text-xs text-slate-500 mb-3">Điều hướng câu hỏi</p>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQ(i)}
                    className={`h-9 w-9 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      i === currentQ
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                        : answers[q.id]
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="p-4">
            <CardContent className="space-y-3">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Tiến độ</span>
                <span>{answeredCount}/{questions.length}</span>
              </div>
              <Progress value={(answeredCount / questions.length) * 100} />
              <Button
                className="w-full"
                onClick={() => setShowSubmitDialog(true)}
                disabled={submitMut.isPending}
              >
                <Send className="h-4 w-4" />
                {submitMut.isPending ? 'Đang nộp...' : 'Nộp bài'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nộp bài kiểm tra</DialogTitle>
            <DialogDescription>
              {answeredCount < questions.length ? (
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Bạn còn {questions.length - answeredCount} câu chưa trả lời.
                </span>
              ) : (
                'Bạn đã trả lời tất cả câu hỏi. Xác nhận nộp bài?'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowSubmitDialog(false)}>Quay lại</Button>
            <Button
              onClick={() => {
                setShowSubmitDialog(false)
                submitExam()
              }}
              disabled={submitMut.isPending}
            >
              Nộp bài
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
