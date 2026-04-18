import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  XCircle,
  FileText,
  Filter,
  Play,
  ChevronDown,
  ChevronUp,
  Trophy,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuestionType, QuestionTypeLabel } from '@/models'
import { useWrongQuestions } from '@/api/review'

const typeFilters = ['all', QuestionType.MCQ, QuestionType.MULTI, QuestionType.FILL]
const typeFilterLabels = { all: 'Tất cả', ...QuestionTypeLabel }

function formatRelativeTime(isoDate) {
  if (!isoDate) return '—'
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hôm nay'
  if (days === 1) return '1 ngày trước'
  if (days < 7) return `${days} ngày trước`
  if (days < 14) return '1 tuần trước'
  return `${Math.floor(days / 7)} tuần trước`
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

function createReviewHref(chapter) {
  const params = new URLSearchParams({
    chapterId: String(chapter.chapterId),
    mode: 'review',
    questionIds: chapter.questions.map((question) => question.id).join(','),
  })
  return `/study?${params.toString()}`
}

export default function ReviewPage() {
  const { data: docs = [], isLoading } = useWrongQuestions()
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedDoc, setExpandedDoc] = useState(null)

  const totalWrong = useMemo(
    () =>
      docs.reduce(
        (sum, doc) => sum + doc.chapters.reduce((s, ch) => s + ch.questions.length, 0),
        0
      ),
    [docs]
  )

  const filtered = useMemo(
    () =>
      docs
        .map((doc) => ({
          ...doc,
          chapters: doc.chapters
            .map((ch) => ({
              ...ch,
              questions: ch.questions.filter(
                (q) => typeFilter === 'all' || q.questionType === typeFilter
              ),
            }))
            .filter((ch) => ch.questions.length > 0),
        }))
        .filter((doc) => doc.chapters.length > 0),
    [docs, typeFilter]
  )

  const filteredTotal = filtered.reduce(
    (sum, doc) => sum + doc.chapters.reduce((s, ch) => s + ch.questions.length, 0),
    0
  )

  if (isLoading) {
    return <div className="text-sm text-slate-500">Đang tải...</div>
  }

  if (totalWrong === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto text-center py-20"
      >
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 mb-4">
          <Trophy className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Chúc mừng!</h2>
        <p className="text-slate-500 mb-6">Bạn không có câu sai nào cần ôn tập.</p>
        <Link to="/exam">
          <Button>Làm bài kiểm tra tổng hợp</Button>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-slate-900">Ôn tập câu sai</h1>
        <p className="text-slate-500 text-sm mt-1">{totalWrong} câu cần ôn tập</p>
      </motion.div>

      <motion.div variants={item} className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-slate-400" />
        {typeFilters.map((f) => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${typeFilter === f
              ? 'bg-primary-50 text-primary-700 border border-primary-200'
              : 'text-slate-500 border border-slate-200 hover:border-slate-300'
              }`}
          >
            {typeFilterLabels[f]}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto">{filteredTotal} câu</span>
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        {filtered.map((doc) => (
          <Card key={doc.documentTitle} className="overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setExpandedDoc(expandedDoc === doc.documentTitle ? null : doc.documentTitle)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDoc(expandedDoc === doc.documentTitle ? null : doc.documentTitle) } }}
              className="w-full flex items-center gap-4 p-5 text-left cursor-pointer hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 shrink-0">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-800">{doc.documentTitle}</h3>
                <p className="text-xs text-slate-500">
                  {doc.chapters.reduce((s, ch) => s + ch.questions.length, 0)} câu sai · {doc.chapters.length} chương
                </p>
              </div>
              {doc.chapters.length === 1 ? (
                <Link
                  to={createReviewHref(doc.chapters[0])}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button size="sm">
                    <Play className="h-3.5 w-3.5" />
                    Ôn tập
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedDoc(
                      expandedDoc === doc.documentTitle ? null : doc.documentTitle
                    )
                  }}
                >
                  Chọn chương
                </Button>
              )}
              {expandedDoc === doc.documentTitle ? (
                <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              )}
            </div>

            {expandedDoc === doc.documentTitle && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-t border-slate-100"
              >
                {doc.chapters.map((ch) => (
                  <div key={ch.chapterId}>
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs font-medium text-slate-600">{ch.title}</span>
                      <Link
                        to={createReviewHref(ch)}
                        onClick={(e) => e.stopPropagation()}
                        className="ml-auto"
                      >
                        <Button size="sm" variant="outline">
                          <Play className="h-3.5 w-3.5" />
                          Ôn tập chương
                        </Button>
                      </Link>
                      <Badge variant="secondary">{ch.questions.length} câu</Badge>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {ch.questions.map((q) => (
                        <div key={q.id} className="flex items-start gap-3 px-5 py-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 shrink-0 mt-0.5">
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 vn-text">{q.content}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs">
                              <Badge variant={q.questionType === QuestionType.MCQ ? 'default' : q.questionType === QuestionType.MULTI ? 'info' : 'warning'}>
                                {QuestionTypeLabel[q.questionType]}
                              </Badge>
                              <span className="text-red-500">Bạn: {q.selectedAnswer || '—'}</span>
                              <span className="text-emerald-600">Đáp án: {q.correctAnswer}</span>
                              <span className="text-slate-400">Đã thử {q.attemptCount} lần · {formatRelativeTime(q.lastAnsweredAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </Card>
        ))}
      </motion.div>
    </motion.div>
  )
}
