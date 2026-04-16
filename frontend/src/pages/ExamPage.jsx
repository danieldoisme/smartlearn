import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Clock,
  Pause,
  Play,
  Send,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { mockExamQuestions } from '@/mocks'

export default function ExamPage() {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState({})
  const [currentQ, setCurrentQ] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30 * 60)
  const [isPaused, setIsPaused] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/result')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isPaused, navigate])

  const formatTime = useCallback((seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }, [])

  const answeredCount = Object.keys(answers).length
  const question = mockExamQuestions[currentQ]
  const isLowTime = timeLeft < 300

  const handleSubmit = () => {
    navigate('/result')
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
          <p className="text-sm text-slate-500">Giáo trình Cơ sở dữ liệu</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isLowTime ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-200'}`}>
            <Clock className={`h-4 w-4 ${isLowTime ? 'text-red-500' : 'text-slate-400'}`} />
            <span className={`text-base font-mono font-bold ${isLowTime ? 'text-red-600' : 'text-slate-800'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPaused(!isPaused)}
          >
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
                <p className="text-sm text-slate-500 mb-4">Nhấn tiếp tục để quay lại bài thi</p>
                <Button onClick={() => setIsPaused(false)}>
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
                    <Badge variant="secondary">Câu {currentQ + 1}/{mockExamQuestions.length}</Badge>
                    {answers[question.id] && <Badge variant="success">Đã trả lời</Badge>}
                  </div>

                  <p className="text-base text-slate-800 font-medium leading-relaxed vn-text">{question.content}</p>

                  <div className="space-y-2">
                    {question.options.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setAnswers((p) => ({ ...p, [question.id]: opt.label }))}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm transition-all cursor-pointer ${
                          answers[question.id] === opt.label
                            ? 'bg-primary-50 border border-primary-200 text-primary-800'
                            : 'bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
                          answers[question.id] === opt.label
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {opt.label}
                        </span>
                        <span className="vn-text">{opt.content}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
                  <ChevronLeft className="h-4 w-4" /> Câu trước
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentQ(Math.min(mockExamQuestions.length - 1, currentQ + 1))}
                  disabled={currentQ === mockExamQuestions.length - 1}
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
                {mockExamQuestions.map((q, i) => (
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
                <span>{answeredCount}/{mockExamQuestions.length}</span>
              </div>
              <Progress value={(answeredCount / mockExamQuestions.length) * 100} />
              <Button
                className="w-full"
                onClick={() => setShowSubmitDialog(true)}
              >
                <Send className="h-4 w-4" />
                Nộp bài
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
              {answeredCount < mockExamQuestions.length ? (
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Bạn còn {mockExamQuestions.length - answeredCount} câu chưa trả lời.
                </span>
              ) : (
                'Bạn đã trả lời tất cả câu hỏi. Xác nhận nộp bài?'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowSubmitDialog(false)}>Quay lại</Button>
            <Button onClick={handleSubmit}>Nộp bài</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
