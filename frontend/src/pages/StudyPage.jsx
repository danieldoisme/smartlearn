import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Progress } from '@/components/ui/progress'

const mockQuestions = [
  {
    id: 1,
    type: 'mcq',
    content: 'Trong mô hình quan hệ, khóa chính (Primary Key) có đặc điểm nào sau đây?',
    options: [
      { label: 'A', content: 'Có thể chứa giá trị NULL', isCorrect: false },
      { label: 'B', content: 'Giá trị phải là duy nhất và không NULL', isCorrect: true },
      { label: 'C', content: 'Mỗi bảng có thể có nhiều khóa chính', isCorrect: false },
      { label: 'D', content: 'Khóa chính luôn là kiểu số nguyên', isCorrect: false },
    ],
    sourceText: 'Khóa chính (Primary Key) là một hoặc tập hợp các thuộc tính mà giá trị của nó xác định duy nhất mỗi bộ trong quan hệ. Khóa chính không được chứa giá trị NULL.',
    sourcePage: 45,
  },
  {
    id: 2,
    type: 'mcq',
    content: 'Phép toán nào trong đại số quan hệ dùng để kết hợp các bộ từ hai quan hệ dựa trên điều kiện?',
    options: [
      { label: 'A', content: 'Phép chiếu (Projection)', isCorrect: false },
      { label: 'B', content: 'Phép chọn (Selection)', isCorrect: false },
      { label: 'C', content: 'Phép kết (Join)', isCorrect: true },
      { label: 'D', content: 'Phép hợp (Union)', isCorrect: false },
    ],
    sourceText: 'Phép kết (Join) là phép toán kết hợp các bộ từ hai quan hệ thành một quan hệ mới, dựa trên một điều kiện kết nối giữa các thuộc tính.',
    sourcePage: 52,
  },
  {
    id: 3,
    type: 'fill',
    content: 'Chuẩn hóa cơ sở dữ liệu đến dạng chuẩn 3NF nhằm loại bỏ phụ thuộc _______.',
    correctAnswer: 'bắc cầu',
    sourceText: 'Dạng chuẩn 3 (3NF) yêu cầu quan hệ phải ở 2NF và không có thuộc tính không khóa nào phụ thuộc bắc cầu vào khóa chính.',
    sourcePage: 78,
  },
  {
    id: 4,
    type: 'multi',
    content: 'Chọn các đặc tính của giao dịch (Transaction) trong CSDL — tính chất ACID:',
    options: [
      { label: 'A', content: 'Atomicity (Tính nguyên tử)', isCorrect: true },
      { label: 'B', content: 'Consistency (Tính nhất quán)', isCorrect: true },
      { label: 'C', content: 'Isolation (Tính cô lập)', isCorrect: true },
      { label: 'D', content: 'Distribution (Tính phân tán)', isCorrect: false },
      { label: 'E', content: 'Durability (Tính bền vững)', isCorrect: true },
    ],
    sourceText: 'ACID là tập hợp các tính chất đảm bảo giao dịch CSDL được xử lý tin cậy: Atomicity, Consistency, Isolation, Durability.',
    sourcePage: 102,
  },
]

export default function StudyPage() {
  const navigate = useNavigate()
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState({})
  const [fillAnswer, setFillAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [bookmarked, setBookmarked] = useState({})

  const question = mockQuestions[currentQ]
  const totalQ = mockQuestions.length
  const progressPct = ((currentQ + (submitted ? 1 : 0)) / totalQ) * 100

  const handleSelect = (label) => {
    if (submitted) return
    if (question.type === 'multi') {
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

  const handleSubmit = () => setSubmitted(true)

  const isCorrect = (option) => {
    if (!submitted) return null
    return option.isCorrect
  }

  const userIsCorrect = () => {
    if (question.type === 'fill') return fillAnswer.trim().toLowerCase() === question.correctAnswer.toLowerCase()
    if (question.type === 'multi') {
      const sel = selected[question.id] || []
      const correct = question.options.filter((o) => o.isCorrect).map((o) => o.label)
      return sel.length === correct.length && sel.every((s) => correct.includes(s))
    }
    const correct = question.options.find((o) => o.isCorrect)
    return selected[question.id] === correct?.label
  }

  const goNext = () => {
    if (currentQ < totalQ - 1) {
      setCurrentQ(currentQ + 1)
      setSubmitted(false)
      setShowSource(false)
      setFillAnswer('')
    } else {
      navigate('/result')
    }
  }

  const goPrev = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1)
      setSubmitted(false)
      setShowSource(false)
      setFillAnswer('')
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
            <span>Giáo trình CSDL — Chương 3</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-800">Câu {currentQ + 1}/{totalQ}</span>
            <Badge variant={question.type === 'mcq' ? 'default' : question.type === 'multi' ? 'info' : 'warning'}>
              {question.type === 'mcq' ? 'Trắc nghiệm' : question.type === 'multi' ? 'Chọn nhiều' : 'Điền từ'}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setBookmarked((p) => ({ ...p, [question.id]: !p[question.id] }))}
        >
          {bookmarked[question.id] ? (
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

          {(question.type === 'mcq' || question.type === 'multi') && (
            <div className="space-y-2">
              {question.options.map((opt) => {
                const isSelected = question.type === 'multi'
                  ? (selected[question.id] || []).includes(opt.label)
                  : selected[question.id] === opt.label
                const correct = isCorrect(opt)

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

          {question.type === 'fill' && (
            <div className="space-y-2">
              <input
                type="text"
                value={fillAnswer}
                onChange={(e) => setFillAnswer(e.target.value)}
                disabled={submitted}
                placeholder="Nhập đáp án..."
                className="glass-input w-full h-11 px-4 text-sm text-slate-800 placeholder:text-slate-400"
              />
              {submitted && (
                <p className={`text-sm ${userIsCorrect() ? 'text-emerald-600' : 'text-red-600'}`}>
                  {userIsCorrect() ? '✓ Chính xác!' : `✗ Đáp án đúng: ${question.correctAnswer}`}
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

      {submitted && (
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
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-xs text-slate-500">Trang {question.sourcePage}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed vn-text italic">
                    &ldquo;{question.sourceText}&rdquo;
                  </p>
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
              <Button onClick={handleSubmit} disabled={!selected[question.id] && !fillAnswer}>
                Xác nhận
              </Button>
            </>
          ) : (
            <Button onClick={goNext}>
              {currentQ < totalQ - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
