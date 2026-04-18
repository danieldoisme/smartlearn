import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Trophy,
  CheckCircle2,
  XCircle,
  SkipForward,
  RotateCcw,
  Home,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  useBookmarks,
  useCreateBookmark,
  useCreateNote,
  useDeleteBookmark,
} from '@/api/bookmarks'
import { useExamResult } from '@/api/exam'

function formatDuration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return '--:--'
  const diffMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return '--:--'
  const totalSec = Math.floor(diffMs / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function buildCitationHref(result) {
  if (!result?.documentId) return null
  const params = new URLSearchParams()
  if (result.chapterId) params.set('focusChapterId', String(result.chapterId))
  return `/document/${result.documentId}${params.toString() ? `?${params.toString()}` : ''}`
}

export default function ResultPage() {
  const [searchParams] = useSearchParams()
  const examIdRaw = searchParams.get('examId')
  const examId = examIdRaw ? Number(examIdRaw) : null
  const { data, isLoading, isError } = useExamResult(examId)
  const { data: bookmarks = [] } = useBookmarks()
  const createBookmark = useCreateBookmark()
  const createNote = useCreateNote()
  const deleteBookmark = useDeleteBookmark()
  const [expandedQ, setExpandedQ] = useState(null)
  const [expandedContext, setExpandedContext] = useState({})
  const [noteDrafts, setNoteDrafts] = useState({})
  const [noteMessages, setNoteMessages] = useState({})

  if (!examId) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <p className="text-slate-600">Không tìm thấy kết quả. Vui lòng làm bài kiểm tra trước.</p>
        <Link to="/library">
          <Button variant="outline">Về thư viện</Button>
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-slate-500">
        Đang tải kết quả...
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <p className="text-slate-600">Không thể tải kết quả.</p>
        <Link to="/">
          <Button variant="outline">Về trang chủ</Button>
        </Link>
      </div>
    )
  }

  const {
    score = 0,
    correctCount = 0,
    wrongCount = 0,
    skippedCount = 0,
    totalQuestions = 0,
    startedAt,
    completedAt,
    results = [],
  } = data

  const timeTaken = formatDuration(startedAt, completedAt)
  const scoreValue = Number(score) || 0
  const scoreColor = scoreValue >= 80 ? 'text-emerald-600' : scoreValue >= 60 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = scoreValue >= 80 ? 'from-emerald-50' : scoreValue >= 60 ? 'from-amber-50' : 'from-red-50'

  const toggleBookmark = async (questionId) => {
    const existing = bookmarks.find((bookmark) => bookmark.questionId === questionId)
    if (existing) {
      await deleteBookmark.mutateAsync(existing.id)
      return
    }
    await createBookmark.mutateAsync({ questionId })
  }

  const saveNote = async (questionId) => {
    const content = noteDrafts[questionId]?.trim()
    if (!content) return
    try {
      await createNote.mutateAsync({ questionId, content })
      setNoteDrafts((prev) => ({ ...prev, [questionId]: '' }))
      setNoteMessages((prev) => ({ ...prev, [questionId]: 'Đã lưu ghi chú.' }))
    } catch {
      setNoteMessages((prev) => ({ ...prev, [questionId]: 'Không thể lưu ghi chú.' }))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <Card className={`p-8 bg-gradient-to-br ${scoreBg} to-white`}>
        <CardContent className="text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100">
            <Trophy className={`h-8 w-8 ${scoreColor}`} />
          </div>
          <div>
            <p className={`text-5xl font-bold ${scoreColor}`}>{scoreValue}%</p>
            <p className="text-slate-500 text-sm mt-1">Điểm số của bạn</p>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-slate-600">{correctCount} đúng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-slate-600">{wrongCount} sai</span>
            </div>
            <div className="flex items-center gap-1.5">
              <SkipForward className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">{skippedCount} bỏ qua</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">Thời gian: {timeTaken}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{correctCount}</p>
            <p className="text-xs text-slate-500 mt-1">Câu đúng</p>
            <Progress value={totalQuestions ? (correctCount / totalQuestions) * 100 : 0} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card className="p-4 text-center">
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{wrongCount}</p>
            <p className="text-xs text-slate-500 mt-1">Câu sai</p>
            <Progress value={totalQuestions ? (wrongCount / totalQuestions) * 100 : 0} className="mt-2 h-1 [&>div>div]:bg-red-400" />
          </CardContent>
        </Card>
        <Card className="p-4 text-center">
          <CardContent>
            <p className="text-2xl font-bold text-slate-400">{skippedCount}</p>
            <p className="text-xs text-slate-500 mt-1">Bỏ qua</p>
            <Progress value={totalQuestions ? (skippedCount / totalQuestions) * 100 : 0} className="mt-2 h-1 [&>div>div]:bg-slate-300" />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Chi tiết từng câu</h2>
        <div className="space-y-2">
          {results.map((q, i) => (
            <Card key={q.questionId} className="p-4">
              <CardContent>
                <button
                  onClick={() => setExpandedQ(expandedQ === q.questionId ? null : q.questionId)}
                  className="w-full flex items-center gap-3 text-left cursor-pointer"
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0 ${q.isCorrect
                      ? 'bg-emerald-50 text-emerald-600'
                      : q.isSkipped
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-red-50 text-red-600'
                    }`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-slate-700 vn-text">{q.content}</span>
                  {q.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : q.isSkipped ? (
                    <SkipForward className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  {expandedQ === q.questionId ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {expandedQ === q.questionId && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 ml-10 space-y-2 text-sm"
                  >
                    {!q.isSkipped && (
                      <p className={q.isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                        Bạn chọn: {q.selectedAnswer} {q.isCorrect ? '✓' : `✗ (Đáp án đúng: ${q.correctAnswer})`}
                      </p>
                    )}
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={createBookmark.isPending || deleteBookmark.isPending}
                        onClick={() => toggleBookmark(q.questionId)}
                      >
                        {bookmarks.some((bookmark) => bookmark.questionId === q.questionId)
                          ? 'Bỏ bookmark'
                          : 'Bookmark câu hỏi'}
                      </Button>
                    </div>
                    {q.isSkipped && <p className="text-slate-400">Câu này đã bỏ qua — Đáp án đúng: {q.correctAnswer}</p>}
                    {(q.sourcePage || q.sourceText) && (
                      <div className="space-y-2 text-xs text-slate-400">
                        {(q.documentTitle || q.chapterTitle) && (
                          <div className="flex flex-wrap items-center gap-2">
                            {q.documentTitle && <span className="font-medium text-slate-500">{q.documentTitle}</span>}
                            {q.chapterTitle && <span>· {q.chapterTitle}</span>}
                          </div>
                        )}
                        {q.sourcePage && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3 w-3" />
                            <span>Trang {q.sourcePage}</span>
                          </div>
                        )}
                        {q.sourceText && (
                          <p className="text-slate-500 italic leading-relaxed vn-text">
                            &ldquo;{q.sourceText}&rdquo;
                          </p>
                        )}
                        {q.sourceContext && q.sourceContext !== q.sourceText && (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedContext((prev) => ({
                                  ...prev,
                                  [q.questionId]: !prev[q.questionId],
                                }))
                              }
                              className="text-xs font-medium text-primary-600 hover:text-primary-700 cursor-pointer"
                            >
                              {expandedContext[q.questionId] ? 'Ẩn ngữ cảnh mở rộng' : 'Xem thêm ngữ cảnh'}
                            </button>
                            {expandedContext[q.questionId] && (
                              <p className="text-slate-500 leading-relaxed vn-text">
                                {q.sourceContext}
                              </p>
                            )}
                          </div>
                        )}
                        {buildCitationHref(q) && (
                          <Link to={buildCitationHref(q)} className="inline-block pt-1">
                            <Button size="sm" variant="outline">
                              <FileText className="h-4 w-4" />
                              Mở trong tài liệu
                            </Button>
                          </Link>
                        )}
                        <div className="space-y-2 pt-1">
                          <Input
                            id={`note-input-${q.questionId}`}
                            name={`note-input-${q.questionId}`}
                            value={noteDrafts[q.questionId] || ''}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({
                                ...prev,
                                [q.questionId]: e.target.value,
                              }))
                            }
                            placeholder="Ghi chú nhanh cho câu hỏi này..."
                          />
                          <div className="flex items-center justify-between gap-3">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!noteDrafts[q.questionId]?.trim() || createNote.isPending}
                              onClick={() => saveNote(q.questionId)}
                            >
                              {createNote.isPending ? 'Đang lưu...' : 'Lưu ghi chú'}
                            </Button>
                            {noteMessages[q.questionId] && (
                              <span className="text-xs text-slate-500">{noteMessages[q.questionId]}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link to="/review" className="flex-1">
          <Button variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4" />
            Ôn tập câu sai
          </Button>
        </Link>
        <Link to="/" className="flex-1">
          <Button className="w-full">
            <Home className="h-4 w-4" />
            Về trang chủ
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}
