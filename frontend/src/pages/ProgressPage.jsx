import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import {
  Target,
  BookOpen,
  HelpCircle,
  TrendingUp,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useWeekly,
  useAccuracyTrend,
  useDocumentsProgress,
  useDocumentProgressDetail,
} from '@/api/progress'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg px-3 py-2 text-xs shadow-lg border border-slate-200">
      <p className="text-slate-800 font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoString(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function DocumentDetailPanel({ documentId, range }) {
  const { data, isLoading } = useDocumentProgressDetail(documentId, range, true)

  if (isLoading) {
    return <p className="text-sm text-slate-500">Đang tải chi tiết...</p>
  }

  if (!data || data.chapters.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Chưa có câu hỏi nào được làm trong khoảng thời gian đã chọn.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {data.chapters.map((chapter) => (
        <div key={chapter.chapterId} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">{chapter.chapterTitle}</h4>
              <p className="text-xs text-slate-500">
                {chapter.answeredCount}/{chapter.questionCount} câu đã làm · {chapter.accuracy}% chính xác
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {chapter.questions.map((question) => (
              <div key={question.questionId} className="rounded-lg border border-white bg-white px-3 py-2">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      question.isSkipped
                        ? 'bg-slate-100 text-slate-400'
                        : question.isCorrect
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {question.isSkipped ? '–' : question.isCorrect ? '✓' : '✗'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 vn-text">{question.content}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Đã thử {question.attemptCount} lần</span>
                      {question.lastAnsweredAt && <span>· {new Date(question.lastAnsweredAt).toLocaleString('vi-VN')}</span>}
                    </div>
                    <div className="mt-1 text-xs">
                      {question.isSkipped ? (
                        <span className="text-slate-400">Bỏ qua · Đáp án đúng: {question.correctAnswer || '—'}</span>
                      ) : (
                        <span className={question.isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                          Bạn chọn: {question.selectedAnswer || '—'} · Đáp án đúng: {question.correctAnswer || '—'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ProgressPage() {
  const [range, setRange] = useState({
    startDate: daysAgoString(29),
    endDate: todayString(),
  })
  const [expandedDocId, setExpandedDocId] = useState(null)
  const [page, setPage] = useState(1)

  const { data: weeklyData = [], isLoading: wLoading } = useWeekly(range)
  const { data: accuracyTrend = [], isLoading: aLoading } = useAccuracyTrend(range)
  const { data: documentProgress = [], isLoading: dLoading } = useDocumentsProgress(range)

  const overviewStats = useMemo(() => {
    const totalDocs = documentProgress.length
    const studiedDocs = documentProgress.filter((d) => (d.answeredCount || 0) > 0).length
    const totalAnswered = documentProgress.reduce((acc, d) => acc + (d.answeredCount || 0), 0)
    const avgAccuracy = documentProgress.length
      ? Math.round(
          documentProgress.reduce((acc, d) => acc + (d.accuracy || 0), 0) /
            Math.max(documentProgress.filter((d) => (d.answeredCount || 0) > 0).length, 1)
        )
      : 0
    const trendDelta = (() => {
      if (accuracyTrend.length < 2) return 0
      const first = accuracyTrend[0]?.accuracy || 0
      const last = accuracyTrend[accuracyTrend.length - 1]?.accuracy || 0
      return last - first
    })()

    return [
      {
        label: 'Tài liệu đã học',
        value: totalDocs ? `${studiedDocs}/${totalDocs}` : '—',
        icon: BookOpen,
        color: 'text-primary-600',
        bg: 'bg-primary-50',
      },
      {
        label: 'Tổng câu đã làm',
        value: String(totalAnswered),
        icon: HelpCircle,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      {
        label: 'Độ chính xác TB',
        value: `${avgAccuracy}%`,
        icon: Target,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      },
      {
        label: 'Xu hướng',
        value: `${trendDelta >= 0 ? '+' : ''}${trendDelta}%`,
        icon: TrendingUp,
        color: trendDelta >= 0 ? 'text-emerald-600' : 'text-red-600',
        bg: trendDelta >= 0 ? 'bg-emerald-50' : 'bg-red-50',
      },
    ]
  }, [documentProgress, accuracyTrend])

  const ITEMS_PER_PAGE = 5
  const totalPages = Math.ceil(documentProgress.length / ITEMS_PER_PAGE)
  const actualPage = page > 1 && page > totalPages ? Math.max(1, totalPages) : page
  const paginatedDocs = useMemo(() => {
    return documentProgress.slice((actualPage - 1) * ITEMS_PER_PAGE, actualPage * ITEMS_PER_PAGE)
  }, [documentProgress, actualPage])

  const isLoading = wLoading || aLoading || dLoading

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-slate-900">Tiến độ học tập</h1>
        <p className="text-slate-500 text-sm mt-1">Theo dõi kết quả và xu hướng</p>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: '7 ngày', start: daysAgoString(6), end: todayString() },
            { label: '30 ngày', start: daysAgoString(29), end: todayString() },
            { label: '90 ngày', start: daysAgoString(89), end: todayString() },
            { label: 'Tất cả', start: '', end: '' },
          ].map((preset) => {
            const active =
              (range.startDate || '') === preset.start && (range.endDate || '') === preset.end
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setRange({
                    startDate: preset.start,
                    endDate: preset.end,
                  })
                  setPage(1)
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  active
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="progress-start-date" className="text-xs font-medium text-slate-600">
              Từ ngày
            </label>
            <Input
              id="progress-start-date"
              type="date"
              value={range.startDate}
              onChange={(e) => { setRange((prev) => ({ ...prev, startDate: e.target.value })); setPage(1); }}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="progress-end-date" className="text-xs font-medium text-slate-600">
              Đến ngày
            </label>
            <Input
              id="progress-end-date"
              type="date"
              value={range.endDate}
              onChange={(e) => { setRange((prev) => ({ ...prev, endDate: e.target.value })); setPage(1); }}
            />
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((s) => (
          <Card key={s.label} className="p-5">
            <CardContent className="flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <Tabs defaultValue="charts">
        <TabsList>
          <TabsTrigger value="charts">Biểu đồ</TabsTrigger>
          <TabsTrigger value="documents">Theo tài liệu</TabsTrigger>
        </TabsList>

        <TabsContent value="charts">
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <CardContent>
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Câu hỏi theo ngày (tuần này)</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="questions" name="Tổng câu" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="correct" name="Đúng" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="p-5">
              <CardContent>
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Xu hướng độ chính xác</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={accuracyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <defs>
                      <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="accuracy" name="Accuracy" stroke="#10b981" fill="url(#accuracyGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="documents">
          <motion.div variants={item} className="space-y-3">
            {isLoading && <p className="text-sm text-slate-500">Đang tải...</p>}
            {!isLoading && documentProgress.length === 0 && (
              <p className="text-sm text-slate-500">Chưa có dữ liệu học tập nào.</p>
            )}
            {paginatedDocs.map((doc) => (
              <Card key={doc.id} className="p-5">
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 shrink-0 mt-0.5">
                      <FileText className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-slate-800">{doc.title}</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            {doc.lastStudied || '—'}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setExpandedDocId((prev) => (prev === doc.id ? null : doc.id))
                            }
                          >
                            {expandedDocId === doc.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Chương</p>
                          <div className="flex items-center gap-2">
                            <Progress value={doc.chapterCount ? (doc.chaptersCompleted / doc.chapterCount) * 100 : 0} className="flex-1 h-1.5" />
                            <span className="text-xs text-slate-600">{doc.chaptersCompleted}/{doc.chapterCount}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Câu hỏi</p>
                          <div className="flex items-center gap-2">
                            <Progress value={doc.questionCount ? (doc.answeredCount / doc.questionCount) * 100 : 0} className="flex-1 h-1.5" />
                            <span className="text-xs text-slate-600">{doc.answeredCount}/{doc.questionCount}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Độ chính xác</p>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className={`h-3.5 w-3.5 ${doc.accuracy >= 75 ? 'text-emerald-500' : doc.accuracy >= 60 ? 'text-amber-500' : 'text-red-500'}`} />
                            <span className={`text-sm font-medium ${doc.accuracy >= 75 ? 'text-emerald-600' : doc.accuracy >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                              {doc.accuracy}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {expandedDocId === doc.id && (
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          <DocumentDetailPanel documentId={doc.id} range={range} />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 font-medium">
                  Trang {actualPage} / {totalPages} ({(actualPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(actualPage * ITEMS_PER_PAGE, documentProgress.length)} / {documentProgress.length})
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, actualPage - 1))} disabled={actualPage <= 1}>
                    <ChevronLeft className="h-4 w-4" /> Trước
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, actualPage + 1))} disabled={actualPage >= totalPages}>
                    Sau <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
