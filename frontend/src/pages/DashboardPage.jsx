import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText,
  HelpCircle,
  Target,
  TrendingUp,
  Upload,
  BookOpen,
  ClipboardCheck,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { mockDocuments, mockTopics, getTopicName } from '@/mocks'

const stats = [
  { label: 'Tài liệu', value: '12', icon: FileText, color: 'text-primary-600', bg: 'bg-primary-50' },
  { label: 'Câu hỏi đã làm', value: '348', icon: HelpCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Độ chính xác', value: '76%', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Chuỗi ngày học', value: '5', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
]

// Recent documents built from Document model + computed progress
const recentDocs = mockDocuments.slice(0, 3).map((doc, i) => ({
  ...doc,
  topicName: getTopicName(doc.topicId),
  chapterCount: [8, 12, 6][i],
  progress: [65, 40, 90][i],
}))

const recentActivity = [
  { type: 'study', desc: 'Hoàn thành Chương 3 — CSDL', time: '2 giờ trước', icon: CheckCircle2, color: 'text-emerald-500' },
  { type: 'exam', desc: 'Kiểm tra tổng hợp — OOP', time: '5 giờ trước', icon: ClipboardCheck, color: 'text-blue-500' },
  { type: 'wrong', desc: '12 câu sai cần ôn tập', time: 'Hôm qua', icon: XCircle, color: 'text-amber-500' },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function DashboardPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 max-w-6xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-slate-900">Xin chào, Thành 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Tiếp tục hành trình học tập của bạn</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Tài liệu gần đây</h2>
            <Link to="/library" className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Xem tất cả <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentDocs.map((doc) => (
              <Card key={doc.id} className="p-4">
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 shrink-0">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                      <Badge variant="secondary">{doc.topicName}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={doc.progress} className="flex-1 h-1.5" />
                      <span className="text-xs text-slate-500 shrink-0">{doc.progress}%</span>
                    </div>
                  </div>
                  <Link to={`/document/${doc.id}`}>
                    <Button variant="ghost" size="sm">
                      <BookOpen className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item}>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Hoạt động gần đây</h2>
          <Card className="p-4">
            <CardContent className="space-y-4">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <a.icon className={`h-4 w-4 mt-0.5 shrink-0 ${a.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{a.desc}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {a.time}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <h2 className="text-base font-semibold text-slate-900 mt-6 mb-4">Hành động nhanh</h2>
          <div className="space-y-2">
            <Link to="/upload" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Upload className="h-4 w-4 text-primary-600" />
                Tải tài liệu mới
              </Button>
            </Link>
            <Link to="/study" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <BookOpen className="h-4 w-4 text-blue-600" />
                Tiếp tục học tập
              </Button>
            </Link>
            <Link to="/exam" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <ClipboardCheck className="h-4 w-4 text-amber-600" />
                Làm bài kiểm tra
              </Button>
            </Link>
            <Link to="/review" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <RotateCcw className="h-4 w-4 text-red-500" />
                Ôn tập câu sai
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
