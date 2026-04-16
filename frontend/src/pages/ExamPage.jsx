import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Pause, Play, Flag, ChevronLeft, ChevronRight, AlertTriangle, Send, ClipboardCheck,
} from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const QUESTIONS = [
  { id: 1, content: 'Phát biểu nào sau đây đúng về ACID trong hệ thống CSDL?', options: ['Atomicity, Consistency, Isolation, Durability', 'Availability, Consistency, Integrity, Durability', 'Atomicity, Concurrency, Integrity, Data', 'Tất cả đều sai'] },
  { id: 2, content: 'Câu lệnh SQL nào dùng để tạo bảng mới?', options: ['CREATE TABLE', 'INSERT TABLE', 'NEW TABLE', 'MAKE TABLE'] },
  { id: 3, content: 'Index trong CSDL có tác dụng gì?', options: ['Tăng dung lượng', 'Tăng tốc truy vấn', 'Mã hoá dữ liệu', 'Sao lưu tự động'] },
  { id: 4, content: 'Mô hình quan hệ được đề xuất bởi ai?', options: ['Bill Gates', 'E.F. Codd', 'Alan Turing', 'Dennis Ritchie'] },
  { id: 5, content: 'Dạng chuẩn 1NF yêu cầu điều gì?', options: ['Loại bỏ phụ thuộc hàm', 'Mỗi ô chứa giá trị đơn', 'Khóa chính phức hợp', 'Không có NULL'] },
]
const TOTAL = 20

export default function ExamPage() {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState(new Set())
  const [paused, setPaused] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [timeLeft, setTimeLeft] = useState(38 * 60 + 42)
  const navigate = useNavigate()

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setTimeLeft(s => s > 0 ? s - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [paused])

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const secs = (timeLeft % 60).toString().padStart(2, '0')
  const timerRed = timeLeft < 300
  const q = QUESTIONS[current % QUESTIONS.length]
  const unanswered = TOTAL - Object.keys(answers).length
  const answeredCount = Object.keys(answers).length

  const boxStyle = (i) => {
    if (i === current) return 'ring-2 ring-primary ring-offset-1 bg-primary-container text-primary font-bold scale-105'
    if (flagged.has(i)) return 'bg-secondary-container text-secondary font-bold'
    if (answers[i] !== undefined) return 'bg-primary text-on-primary font-bold shadow-sm'
    return 'bg-white border border-outline-variant text-muted hover:bg-surface-dim'
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-3.5 bg-white border-b border-outline-variant shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-surface-container to-surface-highest flex items-center justify-center">
              <ClipboardCheck size={16} className="text-muted" />
            </div>
            <div>
              <p className="text-[11px] text-muted font-medium">Bài kiểm tra tổng hợp</p>
              <h2 className="text-sm font-bold text-on-surface">Kiểm tra tổng hợp — Cơ sở dữ liệu</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold tabular-nums transition-all duration-300",
              timerRed ? "text-error bg-error-container animate-pulse shadow-lg shadow-error/10" : "text-on-surface bg-surface-container"
            )}>
              <Clock size={16} />
              <span className="text-2xl">{mins}:{secs}</span>
            </div>
            <Button variant="outline" onClick={() => setPaused(!paused)}>
              {paused ? <><Play size={14} /> Tiếp tục</> : <><Pause size={14} /> Tạm dừng</>}
            </Button>
            <Button onClick={() => setShowDialog(true)}>
              <Send size={14} /> Nộp bài
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Question */}
          <div className="flex-1 flex flex-col overflow-auto p-8">
            <AnimatePresence mode="wait">
              <motion.div key={current}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="flex-1"
              >
                <Card className="h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-5">
                      <Badge>Câu {current + 1} / {TOTAL}</Badge>
                      <Button
                        variant={flagged.has(current) ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFlagged(prev => { const s = new Set(prev); s.has(current) ? s.delete(current) : s.add(current); return s })}
                      >
                        <Flag size={14} className={flagged.has(current) ? 'fill-current' : ''} />
                        {flagged.has(current) ? 'Đã đánh dấu' : 'Đánh dấu'}
                      </Button>
                    </div>
                    <p className="text-lg font-semibold text-on-surface mb-8 leading-relaxed">{q.content}</p>
                    <div className="space-y-3">
                      {q.options.map((opt, idx) => (
                        <button key={idx}
                          onClick={() => setAnswers(prev => ({ ...prev, [current]: idx }))}
                          className={cn(
                            "w-full flex items-center gap-3.5 px-5 py-4 rounded-xl border-2 text-sm font-medium text-left transition-all duration-200",
                            answers[current] === idx
                              ? "border-primary bg-primary-container/30 text-primary shadow-md shadow-primary/10 -translate-y-0.5"
                              : "border-outline-variant bg-white hover:border-primary-light hover:bg-surface-dim hover:shadow-sm hover:-translate-y-0.5"
                          )}>
                          <span className={cn(
                            "w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200",
                            answers[current] === idx ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-muted"
                          )}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between mt-4">
              <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>
                <ChevronLeft size={16} /> Câu trước
              </Button>
              <Button disabled={current >= TOTAL - 1} onClick={() => setCurrent(c => c + 1)}>
                Câu sau <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          {/* Right panel */}
          <aside className="w-56 shrink-0 bg-white border-l border-outline-variant p-4 overflow-auto hidden lg:flex flex-col">
            <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-3">Danh sách câu hỏi</h3>
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
                  className={cn("w-full aspect-square rounded-lg text-xs transition-all duration-200", boxStyle(i))}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="text-xs text-muted space-y-1.5">
              {[['bg-primary','Đã làm'],['border border-outline-variant bg-white','Chưa làm'],['bg-secondary-container','Đánh dấu']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-2"><div className={cn("w-3.5 h-3.5 rounded", c)} /><span>{l}</span></div>
              ))}
            </div>
            <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-surface-dim to-white border border-outline-variant">
              <p className="text-xs text-muted font-medium">Chưa hoàn thành</p>
              <p className="text-2xl font-bold text-on-surface">{unanswered} <span className="text-sm font-medium text-muted">câu</span></p>
            </div>
          </aside>
        </div>
      </div>

      {/* Submit dialog — Radix */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary-container to-primary-container flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={28} className="text-primary" />
            </div>
            <DialogTitle className="text-center">Xác nhận nộp bài?</DialogTitle>
            <DialogDescription className="text-center">
              Bạn còn <strong className="text-error bg-error-container px-1.5 py-0.5 rounded">{unanswered} câu</strong> chưa trả lời. Sau khi nộp bạn không thể chỉnh sửa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>Hủy</Button>
            <Button className="flex-1" onClick={() => navigate('/result')}>
              <Send size={14} /> Nộp bài
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
