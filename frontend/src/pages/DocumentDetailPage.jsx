import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  FileText,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  Settings2,
  Play,
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

const mockDocument = {
  id: 1,
  title: 'Giáo trình Cơ sở dữ liệu',
  topic: 'CSDL',
  fileType: 'pdf',
  fileSize: '4.2 MB',
  totalQuestions: 64,
  createdAt: '12/03/2026',
  chapters: [
    { id: 1, title: 'Chương 1: Tổng quan về CSDL', questions: 8, answered: 8, accuracy: 87, status: 'completed', pageStart: 1, pageEnd: 18 },
    { id: 2, title: 'Chương 2: Mô hình quan hệ', questions: 10, answered: 10, accuracy: 70, status: 'completed', pageStart: 19, pageEnd: 42 },
    { id: 3, title: 'Chương 3: Đại số quan hệ', questions: 12, answered: 8, accuracy: 75, status: 'in_progress', pageStart: 43, pageEnd: 68 },
    { id: 4, title: 'Chương 4: Ngôn ngữ SQL', questions: 10, answered: 0, accuracy: 0, status: 'not_started', pageStart: 69, pageEnd: 95 },
    { id: 5, title: 'Chương 5: Chuẩn hóa CSDL', questions: 8, answered: 0, accuracy: 0, status: 'not_started', pageStart: 96, pageEnd: 120 },
    { id: 6, title: 'Chương 6: Thiết kế CSDL', questions: 6, answered: 0, accuracy: 0, status: 'not_started', pageStart: 121, pageEnd: 145 },
    { id: 7, title: 'Chương 7: Giao dịch & Khóa', questions: 5, answered: 0, accuracy: 0, status: 'not_started', pageStart: 146, pageEnd: 168 },
    { id: 8, title: 'Chương 8: Bảo mật & Phân quyền', questions: 5, answered: 0, accuracy: 0, status: 'not_started', pageStart: 169, pageEnd: 190 },
  ],
}

const questionTypes = [
  { value: 'mcq', label: 'Trắc nghiệm' },
  { value: 'multi', label: 'Chọn nhiều' },
  { value: 'fill', label: 'Điền từ' },
  { value: 'mixed', label: 'Hỗn hợp' },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function DocumentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateChapter, setGenerateChapter] = useState(null)
  const [genConfig, setGenConfig] = useState({ type: 'mixed', count: 10 })
  const [generating, setGenerating] = useState(false)

  const doc = mockDocument
  const totalAnswered = doc.chapters.reduce((s, c) => s + c.answered, 0)
  const overallProgress = Math.round((totalAnswered / doc.totalQuestions) * 100)

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      setShowGenerate(false)
    }, 2000)
  }

  const statusIcon = (status) => {
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    if (status === 'in_progress') return <Loader2 className="h-4 w-4 text-primary-500" />
    return <Circle className="h-4 w-4 text-slate-300" />
  }

  const statusLabel = (status) => {
    if (status === 'completed') return <Badge variant="success">Hoàn thành</Badge>
    if (status === 'in_progress') return <Badge variant="info">Đang học</Badge>
    return <Badge variant="secondary">Chưa học</Badge>
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl">
      <motion.div variants={item} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/library')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{doc.title}</h1>
            <Badge variant="secondary">{doc.topic}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{doc.chapters.length} chương · {doc.totalQuestions} câu hỏi · {doc.fileSize}</p>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card className="p-5">
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">Tiến độ tổng thể</span>
              <span className="text-sm font-bold text-slate-900">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2.5" />
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
              <span>{totalAnswered}/{doc.totalQuestions} câu đã làm</span>
              <span>{doc.chapters.filter((c) => c.status === 'completed').length}/{doc.chapters.length} chương hoàn thành</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Mục lục</h2>
        </div>

        <div className="space-y-2">
          {doc.chapters.map((ch) => (
            <Card key={ch.id} className="p-4 group">
              <CardContent>
                <div className="flex items-center gap-4">
                  {statusIcon(ch.status)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-slate-800">{ch.title}</h3>
                      {statusLabel(ch.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Trang {ch.pageStart}–{ch.pageEnd}</span>
                      <span>{ch.questions} câu hỏi</span>
                      {ch.answered > 0 && (
                        <>
                          <span>{ch.answered}/{ch.questions} đã làm</span>
                          <span className={ch.accuracy >= 75 ? 'text-emerald-600' : ch.accuracy >= 60 ? 'text-amber-600' : 'text-red-600'}>
                            {ch.accuracy}% chính xác
                          </span>
                        </>
                      )}
                    </div>
                    {ch.answered > 0 && (
                      <Progress value={(ch.answered / ch.questions) * 100} className="mt-2 h-1" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {ch.questions === 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setGenerateChapter(ch); setShowGenerate(true) }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Tạo câu hỏi
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setGenerateChapter(ch); setShowGenerate(true) }}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Tạo thêm
                        </Button>
                        <Link to="/study">
                          <Button size="sm">
                            <Play className="h-3.5 w-3.5" />
                            Học
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-500" />
              Tạo câu hỏi tự động
            </DialogTitle>
            <DialogDescription>
              {generateChapter?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Loại câu hỏi</label>
              <div className="flex gap-2 flex-wrap">
                {questionTypes.map((qt) => (
                  <button
                    key={qt.value}
                    onClick={() => setGenConfig({ ...genConfig, type: qt.value })}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      genConfig.type === qt.value
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Số lượng câu hỏi</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGenConfig({ ...genConfig, count: n })}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      genConfig.count === n
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {n} câu
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowGenerate(false)}>Hủy</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Tạo câu hỏi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
