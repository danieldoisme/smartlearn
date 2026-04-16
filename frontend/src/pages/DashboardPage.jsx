import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText, CheckCircle, Flame, Trophy, ArrowRight, BookOpen, AlertTriangle,
} from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const STATS = [
  { label: 'Tài liệu đã tải', value: '12', icon: FileText, gradient: 'from-primary to-primary-light' },
  { label: 'Câu đã học', value: '348', icon: CheckCircle, gradient: 'from-tertiary to-[#4A8885]' },
  { label: 'Chuỗi ngày học', value: '7', icon: Flame, gradient: 'from-secondary to-[#6B7A5F]' },
  { label: 'Điểm trung bình', value: '82%', icon: Trophy, gradient: 'from-primary to-tertiary' },
]

const RECENT_DOCS = [
  { title: 'Giáo trình Cơ sở dữ liệu', chapters: 8, questions: 120, progress: 65, topic: 'CSDL' },
  { title: 'Lập trình Python nâng cao', chapters: 12, questions: 180, progress: 40, topic: 'Python' },
  { title: 'Toán rời rạc ứng dụng', chapters: 6, questions: 90, progress: 80, topic: 'Toán' },
]

const ACTIVITY = [
  { time: 'Hôm nay, 10:30', action: 'Hoàn thành chương 4 — CSDL', score: '18/20', ok: true },
  { time: 'Hôm qua, 15:00', action: 'Ôn tập câu sai — Python', score: '12/15', ok: true },
  { time: 'Hôm qua, 09:00', action: 'Kiểm tra tổng hợp — Toán', score: '75%', ok: false },
]

const container = { animate: { transition: { staggerChildren: 0.06 } } }
const item = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <AppLayout>
      <div className="py-12 px-10 max-w-5xl mx-auto space-y-16">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-2xl px-10 py-12 relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-tertiary"
        >
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -right-16 w-56 h-56 rounded-full bg-white/5" />

          <div className="relative z-10">
            <p className="text-white/60 text-sm mb-2 capitalize">{today}</p>
            <h1 className="text-3xl font-bold text-white mb-3">Xin chào, Đức Thành! 👋</h1>
            <p className="text-white/70 text-base max-w-lg mb-8 leading-relaxed">
              Bạn đã duy trì chuỗi <strong className="text-primary-container">7 ngày</strong> liên tục. Hãy tiếp tục hành trình học tập hôm nay!
            </p>
            <div className="flex gap-4">
              <Button onClick={() => navigate('/study')} className="bg-white text-primary hover:bg-primary-container shadow-md">
                Tiếp tục học <ArrowRight size={16} />
              </Button>
              <Button onClick={() => navigate('/upload')} variant="ghost" className="text-white/90 hover:bg-white/15 hover:text-white border border-white/20">
                Tải tài liệu mới
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <motion.div variants={container} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <motion.div key={s.label} variants={item}>
              <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <CardContent className="px-6 py-7 pt-7">
                  <div className={cn("inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 shadow-md bg-gradient-to-br", s.gradient)}>
                    <s.icon size={20} className="text-white" />
                  </div>
                  <p className="text-3xl font-bold text-on-surface tracking-tight">{s.value}</p>
                  <p className="text-sm text-muted mt-2 font-medium">{s.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Continue Learning ── */}
        <motion.section variants={container} initial="initial" animate="animate">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-on-surface">Tiếp tục học</h2>
              <p className="text-sm text-muted mt-1.5">Nhấn vào tài liệu để tiếp tục từ nơi bạn dừng lại</p>
            </div>
            <Button variant="link" onClick={() => navigate('/library')}>
              Xem tất cả <ArrowRight size={14} />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {RECENT_DOCS.map((doc) => (
              <motion.div key={doc.title} variants={item}>
                <Card
                  onClick={() => navigate('/study')}
                  className="cursor-pointer group hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-light opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="px-6 py-7 pt-7">
                    <div className="flex items-start justify-between mb-5">
                      <Badge>{doc.topic}</Badge>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-surface-container to-surface-highest flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <BookOpen size={18} className="text-muted" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-on-surface text-sm mb-2 leading-snug group-hover:text-primary transition-colors duration-200">{doc.title}</h3>
                    <p className="text-xs text-muted mb-6">{doc.chapters} chương · {doc.questions} câu hỏi</p>

                    <div className="mb-6">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-muted font-medium">Tiến độ</span>
                        <span className="text-primary font-bold">{doc.progress}%</span>
                      </div>
                      <Progress value={doc.progress} />
                    </div>

                    <Button className="w-full" size="sm">
                      Tiếp tục <ArrowRight size={14} />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Bottom Grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-surface-container to-surface-highest flex items-center justify-center">
                  <BookOpen size={15} className="text-muted" />
                </div>
                Hoạt động gần đây
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-2">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="flex gap-4 items-center p-4 rounded-xl hover:bg-surface-dim transition-colors duration-150">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    a.ok ? "bg-tertiary-container/60 text-tertiary" : "bg-error-container/60 text-error"
                  )}>
                    {a.ok ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-on-surface font-medium truncate">{a.action}</p>
                    <p className="text-xs text-muted mt-1">{a.time}</p>
                  </div>
                  <Badge variant={a.ok ? 'tertiary' : 'destructive'}>{a.score}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Review suggestions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-container/40 to-tertiary-container/40 flex items-center justify-center">
                    <AlertTriangle size={15} className="text-primary" />
                  </div>
                  Gợi ý ôn tập
                </CardTitle>
                <Badge variant="destructive">Cần ôn</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-3">
              {[
                { chapter: 'Chương 3 — Chuẩn hoá CSDL', wrong: 5 },
                { chapter: 'Chương 7 — Hàm trong Python', wrong: 3 },
                { chapter: 'Chương 2 — Lý thuyết đồ thị', wrong: 7 },
              ].map((r) => (
                <div key={r.chapter} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-surface-dim to-white border border-outline-variant hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div>
                    <p className="text-sm font-medium text-on-surface">{r.chapter}</p>
                    <p className="text-xs text-error font-medium mt-1">{r.wrong} câu sai cần ôn</p>
                  </div>
                  <Button size="sm" onClick={() => navigate('/study')}>Ôn ngay</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  )
}
