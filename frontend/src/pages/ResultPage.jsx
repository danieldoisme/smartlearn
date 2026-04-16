import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Trophy, CheckCircle, XCircle, SkipForward, Clock, RotateCcw, ArrowRight, Library,
} from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const WRONG = [
  { question: 'Cú pháp nào dùng để lấy các bản ghi duy nhất trong SQL?', userAnswer: 'SELECT UNIQUE', correct: 'SELECT DISTINCT' },
  { question: 'Dạng chuẩn nào loại bỏ phụ thuộc bắc cầu?', userAnswer: '2NF', correct: '3NF' },
  { question: 'Khoá ngoại (Foreign Key) dùng để làm gì?', userAnswer: 'Tăng tốc truy vấn', correct: 'Đảm bảo tính toàn vẹn tham chiếu' },
]

const STATS = [
  { label: 'Đúng', value: '15', sub: '75%', icon: CheckCircle, gradient: 'from-tertiary-container to-secondary-container', text: 'text-tertiary' },
  { label: 'Sai', value: '3', sub: '15%', icon: XCircle, gradient: 'from-error-container to-[#FFE5E0]', text: 'text-error' },
  { label: 'Bỏ qua', value: '2', sub: '10%', icon: SkipForward, gradient: 'from-secondary-container to-surface-container', text: 'text-secondary' },
  { label: 'Thời gian', value: '12\'45"', sub: 'phút', icon: Clock, gradient: 'from-surface-container to-surface-high', text: 'text-on-surface-variant' },
]

const stagger = { animate: { transition: { staggerChildren: 0.07 } } }
const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function ResultPage() {
  const navigate = useNavigate()

  return (
    <AppLayout>
      <div className="p-10 max-w-2xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center rounded-2xl border border-outline-variant shadow-sm p-12 mb-10 relative overflow-hidden bg-gradient-to-br from-tertiary-container via-secondary-container to-primary-container"
        >
          <div className="absolute -top-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-white/10" />
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              <Trophy size={56} className="text-tertiary mx-auto mb-4" />
            </motion.div>
            <h1 className="text-3xl font-bold text-on-surface mb-1">Hoàn thành xuất sắc!</h1>
            <p className="text-on-surface-variant">Chương 4: Truy vấn SQL nâng cao</p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {STATS.map(s => (
            <motion.div key={s.label} variants={fadeUp}>
              <div className={cn("rounded-2xl p-4 text-center bg-gradient-to-br hover:shadow-md hover:-translate-y-0.5 transition-all duration-200", s.gradient)}>
                <s.icon size={22} className={cn("mx-auto mb-1.5", s.text)} />
                <p className={cn("text-2xl font-bold", s.text)}>{s.value}</p>
                <p className={cn("text-xs font-semibold opacity-70", s.text)}>{s.label}</p>
                <p className={cn("text-[10px] opacity-50 mt-0.5", s.text)}>{s.sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Chart */}
        <motion.div {...fadeUp}>
          <Card className="mb-10">
            <CardContent className="p-8 flex items-center gap-10">
              <div className="relative w-32 h-32 shrink-0">
                <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#EDEEE7" strokeWidth="3.2" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#386663" strokeWidth="3.2" strokeDasharray="75 25" strokeLinecap="round" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#BA1A1A" strokeWidth="3.2" strokeDasharray="15 85" strokeDashoffset="-75" strokeLinecap="round" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#C5EFAB" strokeWidth="3.2" strokeDasharray="10 90" strokeDashoffset="-90" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-on-surface">75%</span>
                  <span className="text-xs text-muted font-medium">đúng</span>
                </div>
              </div>
              <div className="space-y-3 flex-1">
                <h3 className="text-sm font-bold text-on-surface mb-3">Phân bổ kết quả</h3>
                {[
                  { color: '#386663', label: 'Đúng', desc: '15 câu (75%)', pct: 75 },
                  { color: '#BA1A1A', label: 'Sai', desc: '3 câu (15%)', pct: 15 },
                  { color: '#C5EFAB', label: 'Bỏ qua', desc: '2 câu (10%)', pct: 10 },
                ].map(r => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                        <span className="text-sm text-on-surface font-medium">{r.label}</span>
                      </div>
                      <span className="text-xs text-muted">{r.desc}</span>
                    </div>
                    <Progress value={r.pct} indicatorClassName={`bg-[${r.color}]`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Wrong answers */}
        <motion.div {...fadeUp}>
          <Card className="mb-10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-error-container to-[#FFE5E0] flex items-center justify-center">
                  <XCircle size={16} className="text-error" />
                </div>
                Câu trả lời chưa đúng
                <Badge variant="destructive" className="ml-auto">{WRONG.length} câu</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {WRONG.map((w, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gradient-to-r from-surface-dim to-white border border-outline-variant hover:shadow-md transition-all duration-200">
                    <p className="text-sm font-semibold text-on-surface mb-3 leading-relaxed">{w.question}</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-error-container/50 border border-error/15">
                        <p className="text-[10px] font-bold text-error uppercase tracking-wide mb-1">Đáp án của bạn</p>
                        <p className="text-sm text-error font-medium">{w.userAnswer}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-tertiary-container/50 border border-tertiary/15">
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wide mb-1">Đáp án đúng</p>
                        <p className="text-sm text-tertiary font-medium">{w.correct}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div {...fadeUp} className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate('/study')} className="flex-1" size="lg">
            <RotateCcw size={16} /> Ôn tập câu sai
          </Button>
          <Button variant="outline" onClick={() => navigate('/study')} className="flex-1" size="lg">
            Học chương tiếp <ArrowRight size={16} />
          </Button>
          <Button variant="ghost" onClick={() => navigate('/library')} className="flex-1" size="lg">
            <Library size={16} /> Về thư viện
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  )
}
