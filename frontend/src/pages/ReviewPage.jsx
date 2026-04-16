import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  RotateCcw,
  XCircle,
  FileText,
  Filter,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Trophy,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { QuestionType, QuestionTypeLabel } from '@/models'

// Review data: wrong UserAnswers joined with Question + Chapter + Document.
// In production, this nested view comes from a dedicated API endpoint.
const mockWrongQuestions = [
  {
    documentTitle: 'Giáo trình Cơ sở dữ liệu',
    chapters: [
      {
        chapterId: 2,
        title: 'Chương 2: Mô hình quan hệ',
        questions: [
          { id: 1, content: 'Dạng chuẩn 1NF yêu cầu điều gì?', questionType: QuestionType.MCQ, selectedAnswer: 'A', correctAnswer: 'B', attemptCount: 1, lastAnsweredAt: '2026-04-14T08:00:00Z' },
          { id: 2, content: 'Ràng buộc NOT NULL thuộc loại nào?', questionType: QuestionType.MCQ, selectedAnswer: 'B', correctAnswer: 'A', attemptCount: 2, lastAnsweredAt: '2026-04-13T08:00:00Z' },
        ],
      },
      {
        chapterId: 3,
        title: 'Chương 3: Đại số quan hệ',
        questions: [
          { id: 3, content: 'Phép chia (Division) trong đại số quan hệ dùng để làm gì?', questionType: QuestionType.MCQ, selectedAnswer: 'C', correctAnswer: 'A', attemptCount: 1, lastAnsweredAt: '2026-04-15T08:00:00Z' },
        ],
      },
    ],
  },
  {
    documentTitle: 'Lập trình hướng đối tượng',
    chapters: [
      {
        chapterId: 9,
        title: 'Chương 3: Kế thừa',
        questions: [
          { id: 4, content: 'Multiple inheritance gây ra vấn đề gì trong C++?', questionType: QuestionType.MCQ, selectedAnswer: 'A', correctAnswer: 'C', attemptCount: 1, lastAnsweredAt: '2026-04-11T08:00:00Z' },
          { id: 5, content: 'Abstract class khác Interface ở điểm nào?', questionType: QuestionType.MULTI, selectedAnswer: 'A, B', correctAnswer: 'A, C, D', attemptCount: 3, lastAnsweredAt: '2026-04-12T08:00:00Z' },
        ],
      },
      {
        chapterId: 11,
        title: 'Chương 5: Design Patterns',
        questions: [
          { id: 6, content: 'Singleton pattern đảm bảo điều gì?', questionType: QuestionType.FILL, selectedAnswer: 'một instance', correctAnswer: 'chỉ có một instance duy nhất', attemptCount: 1, lastAnsweredAt: '2026-04-10T08:00:00Z' },
        ],
      },
    ],
  },
  {
    documentTitle: 'Mạng máy tính',
    chapters: [
      {
        chapterId: 15,
        title: 'Chương 1: Mô hình OSI',
        questions: [
          { id: 7, content: 'Tầng nào chịu trách nhiệm định tuyến?', questionType: QuestionType.MCQ, selectedAnswer: 'B', correctAnswer: 'C', attemptCount: 1, lastAnsweredAt: '2026-04-09T08:00:00Z' },
        ],
      },
    ],
  },
]

const typeFilters = ['all', QuestionType.MCQ, QuestionType.MULTI, QuestionType.FILL]
const typeFilterLabels = { all: 'Tất cả', ...QuestionTypeLabel }

function formatRelativeTime(isoDate) {
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

export default function ReviewPage() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedDoc, setExpandedDoc] = useState(mockWrongQuestions[0]?.documentTitle)

  const totalWrong = mockWrongQuestions.reduce(
    (sum, doc) => sum + doc.chapters.reduce((s, ch) => s + ch.questions.length, 0),
    0
  )

  const filtered = mockWrongQuestions.map((doc) => ({
    ...doc,
    chapters: doc.chapters
      .map((ch) => ({
        ...ch,
        questions: ch.questions.filter((q) => typeFilter === 'all' || q.questionType === typeFilter),
      }))
      .filter((ch) => ch.questions.length > 0),
  })).filter((doc) => doc.chapters.length > 0)

  const filteredTotal = filtered.reduce(
    (sum, doc) => sum + doc.chapters.reduce((s, ch) => s + ch.questions.length, 0),
    0
  )

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
              <Link to="/study" onClick={(e) => e.stopPropagation()}>
                <Button size="sm">
                  <Play className="h-3.5 w-3.5" />
                  Ôn tập
                </Button>
              </Link>
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
                      <Badge variant="secondary" className="ml-auto">{ch.questions.length} câu</Badge>
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
                              <span className="text-red-500">Bạn: {q.selectedAnswer}</span>
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
