import { Link } from 'react-router-dom'
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
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const mockResult = {
  totalQuestions: 10,
  correct: 7,
  wrong: 2,
  skipped: 1,
  score: 70,
  timeTaken: '18:42',
  questions: [
    { id: 1, content: 'Trong SQL, lệnh nào dùng để tạo bảng mới?', userAnswer: 'B', correctAnswer: 'B', isCorrect: true, source: 'Trang 23' },
    { id: 2, content: 'Khóa ngoại (Foreign Key) dùng để làm gì?', userAnswer: 'C', correctAnswer: 'C', isCorrect: true, source: 'Trang 31' },
    { id: 3, content: 'Dạng chuẩn 1NF yêu cầu điều gì?', userAnswer: 'A', correctAnswer: 'B', isCorrect: false, source: 'Trang 56' },
    { id: 4, content: 'Lệnh SQL nào dùng để xóa tất cả dữ liệu nhưng giữ cấu trúc?', userAnswer: 'C', correctAnswer: 'C', isCorrect: true, source: 'Trang 40' },
    { id: 5, content: 'Phép toán nào trả về các bộ có mặt ở cả hai quan hệ?', userAnswer: 'B', correctAnswer: 'B', isCorrect: true, source: 'Trang 48' },
    { id: 6, content: 'Chỉ mục (Index) tối ưu thao tác nào?', userAnswer: 'C', correctAnswer: 'C', isCorrect: true, source: 'Trang 89' },
    { id: 7, content: 'Ràng buộc NOT NULL thuộc loại nào?', userAnswer: 'B', correctAnswer: 'A', isCorrect: false, source: 'Trang 35' },
    { id: 8, content: 'Trigger là gì?', userAnswer: 'B', correctAnswer: 'B', isCorrect: true, source: 'Trang 112' },
    { id: 9, content: 'VIEW trong SQL là gì?', userAnswer: 'B', correctAnswer: 'B', isCorrect: true, source: 'Trang 95' },
    { id: 10, content: 'Deadlock xảy ra khi nào?', userAnswer: null, correctAnswer: 'B', isCorrect: false, skipped: true, source: 'Trang 130' },
  ],
}

export default function ResultPage() {
  const [expandedQ, setExpandedQ] = useState(null)
  const { totalQuestions, correct, wrong, skipped, score, timeTaken, questions } = mockResult

  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = score >= 80 ? 'from-emerald-50' : score >= 60 ? 'from-amber-50' : 'from-red-50'

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
            <p className={`text-5xl font-bold ${scoreColor}`}>{score}%</p>
            <p className="text-slate-500 text-sm mt-1">Điểm số của bạn</p>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-slate-600">{correct} đúng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-slate-600">{wrong} sai</span>
            </div>
            <div className="flex items-center gap-1.5">
              <SkipForward className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">{skipped} bỏ qua</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">Thời gian: {timeTaken}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{correct}</p>
            <p className="text-xs text-slate-500 mt-1">Câu đúng</p>
            <Progress value={(correct / totalQuestions) * 100} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card className="p-4 text-center">
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{wrong}</p>
            <p className="text-xs text-slate-500 mt-1">Câu sai</p>
            <Progress value={(wrong / totalQuestions) * 100} className="mt-2 h-1 [&>div>div]:bg-red-400" />
          </CardContent>
        </Card>
        <Card className="p-4 text-center">
          <CardContent>
            <p className="text-2xl font-bold text-slate-400">{skipped}</p>
            <p className="text-xs text-slate-500 mt-1">Bỏ qua</p>
            <Progress value={(skipped / totalQuestions) * 100} className="mt-2 h-1 [&>div>div]:bg-slate-300" />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Chi tiết từng câu</h2>
        <div className="space-y-2">
          {questions.map((q, i) => (
            <Card key={q.id} className="p-4">
              <CardContent>
                <button
                  onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                  className="w-full flex items-center gap-3 text-left cursor-pointer"
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
                    q.isCorrect
                      ? 'bg-emerald-50 text-emerald-600'
                      : q.skipped
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-red-50 text-red-600'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-slate-700 vn-text">{q.content}</span>
                  {q.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : q.skipped ? (
                    <SkipForward className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  {expandedQ === q.id ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {expandedQ === q.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 ml-10 space-y-2 text-sm"
                  >
                    {!q.skipped && (
                      <p className={q.isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                        Bạn chọn: {q.userAnswer} {q.isCorrect ? '✓' : `✗ (Đáp án đúng: ${q.correctAnswer})`}
                      </p>
                    )}
                    {q.skipped && <p className="text-slate-400">Câu này đã bỏ qua — Đáp án đúng: {q.correctAnswer}</p>}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <FileText className="h-3 w-3" />
                      <span>{q.source}</span>
                    </div>
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
