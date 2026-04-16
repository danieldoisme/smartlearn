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
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { mockDocuments, getTopicName } from '@/mocks'

// Aggregated stats — in production these come from dedicated API endpoints
const weeklyData = [
  { day: 'T2', questions: 24, correct: 18 },
  { day: 'T3', questions: 32, correct: 25 },
  { day: 'T4', questions: 18, correct: 14 },
  { day: 'T5', questions: 45, correct: 36 },
  { day: 'T6', questions: 28, correct: 22 },
  { day: 'T7', questions: 15, correct: 12 },
  { day: 'CN', questions: 38, correct: 31 },
]

const accuracyTrend = [
  { week: 'Tuần 1', accuracy: 58 },
  { week: 'Tuần 2', accuracy: 63 },
  { week: 'Tuần 3', accuracy: 68 },
  { week: 'Tuần 4', accuracy: 72 },
  { week: 'Tuần 5', accuracy: 70 },
  { week: 'Tuần 6', accuracy: 76 },
]

// Enriched document progress built from Document model + computed study stats
const documentProgress = mockDocuments.slice(0, 5).map((doc, i) => {
  const stats = [
    { chapterCount: 8, chaptersCompleted: 5, questionCount: 64, answeredCount: 48, accuracy: 78, lastStudied: '2 giờ trước' },
    { chapterCount: 12, chaptersCompleted: 5, questionCount: 120, answeredCount: 52, accuracy: 65, lastStudied: '1 ngày trước' },
    { chapterCount: 6, chaptersCompleted: 5, questionCount: 48, answeredCount: 44, accuracy: 82, lastStudied: '3 ngày trước' },
    { chapterCount: 10, chaptersCompleted: 2, questionCount: 85, answeredCount: 18, accuracy: 61, lastStudied: '5 ngày trước' },
    { chapterCount: 7, chaptersCompleted: 4, questionCount: 56, answeredCount: 35, accuracy: 71, lastStudied: '1 tuần trước' },
  ][i]
  return { ...doc, ...stats }
})

const overviewStats = [
  { label: 'Tài liệu đã học', value: '5/6', icon: BookOpen, color: 'text-primary-600', bg: 'bg-primary-50' },
  { label: 'Tổng câu đã làm', value: '197', icon: HelpCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Độ chính xác TB', value: '76%', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Xu hướng', value: '+8%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
]

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

export default function ProgressPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-slate-900">Tiến độ học tập</h1>
        <p className="text-slate-500 text-sm mt-1">Theo dõi kết quả và xu hướng</p>
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
                    <Bar dataKey="questions" name="Tổng câu" fill="#d1fae5" radius={[4, 4, 0, 0]} />
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
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} domain={[50, 100]} />
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
            {documentProgress.map((doc) => (
              <Card key={doc.id} className="p-5">
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 shrink-0 mt-0.5">
                      <FileText className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-slate-800">{doc.title}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {doc.lastStudied}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Chương</p>
                          <div className="flex items-center gap-2">
                            <Progress value={(doc.chaptersCompleted / doc.chapterCount) * 100} className="flex-1 h-1.5" />
                            <span className="text-xs text-slate-600">{doc.chaptersCompleted}/{doc.chapterCount}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Câu hỏi</p>
                          <div className="flex items-center gap-2">
                            <Progress value={(doc.answeredCount / doc.questionCount) * 100} className="flex-1 h-1.5" />
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
