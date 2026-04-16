import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bookmark, SkipForward, ChevronLeft, ChevronRight, BookOpen, Lightbulb, CheckCircle, XCircle,
} from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const QUESTIONS = [
  {
    id: 1, type: 'Trắc nghiệm',
    content: 'Trong SQL, mệnh đề nào dùng để lọc kết quả sau khi GROUP BY?',
    options: ['WHERE', 'HAVING', 'FILTER', 'ORDER BY'],
    correct: 1,
    source: 'Mệnh đề HAVING được sử dụng sau GROUP BY để lọc các nhóm, khác với WHERE lọc trước khi nhóm.',
    page: 142,
  },
  {
    id: 2, type: 'Trắc nghiệm',
    content: 'Khoá chính (Primary Key) trong cơ sở dữ liệu quan hệ có đặc điểm gì?',
    options: ['Có thể NULL', 'Duy nhất và NOT NULL', 'Cho phép trùng lặp', 'Chỉ là số nguyên'],
    correct: 1,
    source: 'Khoá chính phải duy nhất và không được phép NULL, đảm bảo nhận dạng mỗi bản ghi.',
    page: 58,
  },
  {
    id: 3, type: 'Chọn nhiều',
    content: 'Các dạng chuẩn hoá nào phổ biến trong thiết kế CSDL?',
    options: ['1NF', '2NF', '3NF', 'BCNF'],
    correct: 1,
    source: 'Các dạng chuẩn 1NF, 2NF, 3NF và BCNF được dùng để loại bỏ dư thừa dữ liệu.',
    page: 98,
  },
]
const TOTAL = 20

export default function StudyPage() {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [bookmarked, setBookmarked] = useState(new Set())
  const navigate = useNavigate()

  const q = QUESTIONS[current % QUESTIONS.length]
  const answered = answers[current]
  const answeredCount = Object.keys(answers).length

  const handleAnswer = (idx) => { if (answered !== undefined) return; setAnswers(prev => ({ ...prev, [current]: idx })) }

  const getOptionStyle = (idx) => {
    if (answered === undefined) return 'border-outline-variant bg-white hover:bg-surface-dim hover:border-primary-light hover:shadow-sm cursor-pointer hover:-translate-y-0.5'
    if (idx === q.correct) return 'border-tertiary bg-tertiary-container/40 text-tertiary shadow-sm'
    if (idx === answered && idx !== q.correct) return 'border-error bg-error-container/40 text-error shadow-sm'
    return 'border-outline-variant bg-white opacity-40 pointer-events-none'
  }

  const statusColor = (i) => {
    if (answers[i] === undefined) return 'bg-surface-container text-muted hover:bg-surface-high'
    const qi = QUESTIONS[i % QUESTIONS.length]
    return answers[i] === qi.correct ? 'bg-tertiary text-on-tertiary shadow-sm' : 'bg-error text-white shadow-sm'
  }

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden">
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-outline-variant shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-surface-container to-surface-highest flex items-center justify-center">
                <BookOpen size={16} className="text-muted" />
              </div>
              <div>
                <p className="text-[11px] text-muted font-medium">Cơ sở dữ liệu</p>
                <h2 className="text-sm font-bold text-on-surface">Chương 4: Truy vấn SQL nâng cao</h2>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Badge>Câu {current + 1} / {TOTAL}</Badge>
              <Button
                variant={bookmarked.has(current) ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setBookmarked(prev => { const s = new Set(prev); s.has(current) ? s.delete(current) : s.add(current); return s })}
              >
                <Bookmark size={16} className={bookmarked.has(current) ? 'fill-current' : ''} />
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => setAnswers(prev => ({ ...prev, [current]: -1 }))}>
                <SkipForward size={14} /> Bỏ qua
              </Button>
            </div>
          </div>

          {/* Progress */}
          <Progress value={((current + 1) / TOTAL) * 100} className="h-1.5 rounded-none" />

          {/* Question */}
          <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div key={current}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <Card>
                  <CardContent className="p-8">
                    <div className="flex items-center gap-2 mb-5">
                      <Badge>{q.type}</Badge>
                      <span className="text-xs text-muted">· Trang {q.page}</span>
                    </div>
                    <p className="text-lg font-semibold text-on-surface mb-7 leading-relaxed">{q.content}</p>

                    <div className="grid grid-cols-1 gap-3 mb-6">
                      {q.options.map((opt, idx) => (
                        <button key={idx} onClick={() => handleAnswer(idx)}
                          className={cn("flex items-center gap-3.5 px-5 py-4 rounded-xl border-2 text-sm font-medium text-left transition-all duration-200", getOptionStyle(idx))}>
                          <span className={cn(
                            "w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200",
                            answered === undefined ? "border-outline-variant text-muted"
                            : idx === q.correct ? "border-tertiary bg-tertiary text-white"
                            : idx === answered ? "border-error bg-error text-white"
                            : "border-outline-variant text-muted"
                          )}>
                            {answered !== undefined && idx === q.correct ? <CheckCircle size={12} /> : answered !== undefined && idx === answered && idx !== q.correct ? <XCircle size={12} /> : String.fromCharCode(65 + idx)}
                          </span>
                          {opt}
                        </button>
                      ))}
                    </div>

                    {answered !== undefined && answered !== -1 && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-xl bg-gradient-to-r from-surface-dim to-white border border-outline-variant mb-5">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-container/50 flex items-center justify-center shrink-0 mt-0.5">
                            <Lightbulb size={16} className="text-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-on-surface leading-relaxed mb-1.5">{q.source}</p>
                            <p className="text-xs text-muted font-medium flex items-center gap-1">
                              <BookOpen size={12} /> Giáo trình Cơ sở dữ liệu — Trang {q.page}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="flex justify-between pt-2">
                      <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>
                        <ChevronLeft size={16} /> Câu trước
                      </Button>
                      <Button onClick={() => current >= TOTAL - 1 ? navigate('/result') : setCurrent(c => c + 1)}>
                        {current >= TOTAL - 1 ? 'Hoàn thành' : 'Câu tiếp theo'} <ChevronRight size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right panel */}
        <aside className="w-56 shrink-0 bg-white border-l border-outline-variant flex flex-col p-4 hidden lg:flex">
          <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-3">Tiến độ bài học</h3>
          <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-surface-dim to-white border border-outline-variant">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted font-medium">Đã làm</span>
              <span className="text-primary font-bold">{answeredCount}/{TOTAL}</span>
            </div>
            <Progress value={(answeredCount / TOTAL) * 100} />
          </div>
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {Array.from({ length: TOTAL }, (_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={cn("w-full aspect-square rounded-lg text-xs font-bold transition-all duration-200",
                  i === current ? "ring-2 ring-primary ring-offset-1 bg-primary-container text-primary scale-105" : statusColor(i))}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted space-y-1.5 mb-4">
            {[['bg-tertiary','Đúng'],['bg-error','Sai'],['bg-secondary-container','Bỏ qua'],['bg-surface-container','Chưa làm']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-2">
                <div className={cn("w-3.5 h-3.5 rounded", c)} /><span>{l}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto space-y-2">
            <Button className="w-full" size="sm" onClick={() => navigate('/result')}>Nộp bài</Button>
            <Button variant="ghost" className="w-full" size="sm" onClick={() => navigate('/library')}>Quay lại thư viện</Button>
          </div>
        </aside>
      </div>
    </AppLayout>
  )
}
