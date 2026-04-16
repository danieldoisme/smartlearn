import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle, Target, Flame, Clock, BarChart3, BookOpen, AlertTriangle, Bookmark, StickyNote, TrendingUp,
} from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const DAILY = [
  { day: 'T2', count: 45 },
  { day: 'T3', count: 80 },
  { day: 'T4', count: 30 },
  { day: 'T5', count: 95 },
  { day: 'T6', count: 60 },
  { day: 'T7', count: 120 },
  { day: 'CN', count: 75 },
]
const MAX_COUNT = 120

const DOCS = [
  { title: 'Giáo trình Cơ sở dữ liệu', chapters: 8, done: 5, accuracy: 78 },
  { title: 'Lập trình Python nâng cao', chapters: 12, done: 5, accuracy: 65 },
  { title: 'Toán rời rạc ứng dụng', chapters: 6, done: 5, accuracy: 88 },
  { title: 'Bài giảng Mạng máy tính', chapters: 10, done: 2, accuracy: 55 },
]

const WEAK = [
  { name: 'Chương 3 — Chuẩn hoá CSDL', accuracy: 42, wrong: 5 },
  { name: 'Chương 7 — Hàm trong Python', accuracy: 53, wrong: 3 },
  { name: 'Chương 2 — Lý thuyết đồ thị', accuracy: 38, wrong: 7 },
]

const STATS = [
  { label: 'Tổng câu đã học', value: '348', icon: CheckCircle, gradient: 'from-tertiary to-[#4A8885]' },
  { label: 'Tỷ lệ đúng tổng', value: '76%', icon: Target, gradient: 'from-primary to-primary-light' },
  { label: 'Chuỗi ngày dài nhất', value: '12 ngày', icon: Flame, gradient: 'from-secondary to-[#6B7A5F]' },
  { label: 'Tổng thời gian học', value: '14 giờ', icon: Clock, gradient: 'from-primary to-tertiary' },
]

const stagger = { animate: { transition: { staggerChildren: 0.06 } } }
const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function ProgressPage() {
  const [range, setRange] = useState('week')
  const navigate = useNavigate()

  return (
    <AppLayout>
      <div className="p-10 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Tiến độ học tập</h1>
            <p className="text-sm text-muted mt-1">Theo dõi quá trình học tập của bạn</p>
          </div>
          <Tabs value={range} onValueChange={setRange}>
            <TabsList>
              <TabsTrigger value="week">Tuần này</TabsTrigger>
              <TabsTrigger value="month">Tháng này</TabsTrigger>
              <TabsTrigger value="all">Tất cả</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Stats */}
        <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {STATS.map(s => (
            <motion.div key={s.label} variants={fadeUp}>
              <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <CardContent className="p-5">
                  <div className={cn("inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 shadow-md bg-gradient-to-br", s.gradient)}>
                    <s.icon size={20} className="text-white" />
                  </div>
                  <p className="text-3xl font-bold text-on-surface tracking-tight">{s.value}</p>
                  <p className="text-xs text-muted mt-1 font-medium">{s.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Bar chart */}
        <motion.div {...fadeUp}>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-surface-container to-surface-highest flex items-center justify-center">
                  <BarChart3 size={16} className="text-muted" />
                </div>
                Hoạt động 7 ngày gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-36">
                {DAILY.map((d, i) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-xs font-bold text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200">{d.count}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.count / MAX_COUNT) * 100}%` }}
                      transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
                      className="w-full rounded-xl group-hover:scale-x-110 transition-transform duration-200"
                      style={{
                        background: d.count === MAX_COUNT
                          ? 'linear-gradient(to top, #386663, #4A8885)'
                          : 'linear-gradient(to top, #446732, #5E8B48)',
                        opacity: 0.75 + (d.count / MAX_COUNT) * 0.25,
                      }}
                    />
                    <span className={cn("text-xs font-medium", d.day === 'T7' ? "text-primary font-bold" : "text-muted")}>{d.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Doc progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-surface-container to-surface-highest flex items-center justify-center">
                  <BookOpen size={16} className="text-muted" />
                </div>
                Tiến độ theo tài liệu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DOCS.map(d => (
                  <div key={d.title} className="p-3.5 rounded-xl hover:bg-surface-dim transition-all duration-200 -mx-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-semibold text-on-surface leading-snug truncate">{d.title}</p>
                        <p className="text-xs text-muted">{d.done}/{d.chapters} chương</p>
                      </div>
                      <Badge variant={d.accuracy >= 75 ? 'success' : d.accuracy >= 60 ? 'secondary' : 'destructive'}>
                        {d.accuracy}%
                      </Badge>
                    </div>
                    <Progress value={(d.done / d.chapters) * 100} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weak chapters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-error-container to-[#FFE5E0] flex items-center justify-center">
                    <AlertTriangle size={16} className="text-error" />
                  </div>
                  Điểm yếu cần ôn
                </CardTitle>
                <Badge variant="destructive">{WEAK.length} chương</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {WEAK.map((w, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-gradient-to-r from-surface-dim to-white border border-outline-variant hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                    <div className="flex items-start justify-between mb-2.5">
                      <p className="text-sm font-semibold text-on-surface leading-snug flex-1 mr-2">{w.name}</p>
                      <Badge variant="destructive">{w.accuracy}%</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Progress value={w.accuracy} indicatorClassName="bg-error" className="bg-error-container/50" />
                        <p className="text-[11px] text-error mt-1 font-medium">{w.wrong} câu sai</p>
                      </div>
                      <Button size="sm" onClick={() => navigate('/study')}>Ôn tập</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bookmarks */}
        <motion.div {...fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary-container to-primary-container flex items-center justify-center">
                  <Bookmark size={16} className="text-primary" />
                </div>
                Bookmarks & Ghi chú
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Bookmark, label: 'Bookmarks', sub: '14 câu đã đánh dấu' },
                  { icon: StickyNote, label: 'Ghi chú', sub: '8 ghi chú cá nhân' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3.5 p-4 rounded-xl bg-gradient-to-r from-secondary-container/30 to-white border border-outline-variant hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-surface-container to-surface-highest flex items-center justify-center shadow-sm">
                      <item.icon size={20} className="text-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{item.label}</p>
                      <p className="text-xs text-muted">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  )
}
