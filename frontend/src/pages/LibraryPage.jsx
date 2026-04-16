import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search, Plus, BookOpen, MoreHorizontal, CheckCircle2, Trash2,
} from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const TOPICS = ['Tất cả', 'Cơ sở dữ liệu', 'Lập trình Python', 'Toán rời rạc', 'Mạng máy tính']
const DOCS = [
  { title: 'Giáo trình Cơ sở dữ liệu', type: 'PDF', topic: 'Cơ sở dữ liệu', chapters: 8, questions: 120, progress: 65, date: '10/04/2025' },
  { title: 'Lập trình Python nâng cao', type: 'DOCX', topic: 'Lập trình Python', chapters: 12, questions: 180, progress: 40, date: '08/04/2025' },
  { title: 'Toán rời rạc ứng dụng', type: 'PDF', topic: 'Toán rời rạc', chapters: 6, questions: 90, progress: 80, date: '05/04/2025' },
  { title: 'Bài giảng Mạng máy tính', type: 'PDF', topic: 'Mạng máy tính', chapters: 10, questions: 150, progress: 20, date: '01/04/2025' },
  { title: 'Đề cương ôn tập CSDL', type: 'DOCX', topic: 'Cơ sở dữ liệu', chapters: 4, questions: 60, progress: 100, date: '28/03/2025' },
  { title: 'Python cho người mới bắt đầu', type: 'PDF', topic: 'Lập trình Python', chapters: 15, questions: 220, progress: 10, date: '25/03/2025' },
]
const TOPIC_COUNTS = TOPICS.map(t => t === 'Tất cả' ? DOCS.length : DOCS.filter(d => d.topic === t).length)

const stagger = { animate: { transition: { staggerChildren: 0.05 } } }
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export default function LibraryPage() {
  const [activeTopic, setActiveTopic] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = DOCS.filter(d =>
    (activeTopic === 'Tất cả' || d.topic === activeTopic) &&
    d.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="p-10">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Thư viện của tôi</h1>
            <p className="text-sm text-muted mt-1.5">{DOCS.length} tài liệu · {DOCS.reduce((a, d) => a + d.questions, 0)} câu hỏi</p>
          </div>
          <Button onClick={() => navigate('/upload')}>
            <Plus size={16} /> Tải lên tài liệu
          </Button>
        </motion.div>

        {/* Search */}
        <motion.div {...fadeUp} className="relative mb-8">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm tài liệu theo tên..."
            className="pl-11 shadow-sm"
          />
        </motion.div>

        <div className="flex gap-8">
          {/* Topic sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="w-48 shrink-0"
          >
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-3 px-1">Chủ đề</p>
            <div className="space-y-1">
              {TOPICS.map((t, i) => (
                <button key={t} onClick={() => setActiveTopic(t)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-between",
                    activeTopic === t
                      ? "bg-primary text-on-primary font-semibold shadow-md shadow-primary/15"
                      : "text-on-surface-variant font-medium hover:bg-surface-dim hover:text-primary"
                  )}>
                  <span>{t}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-md",
                    activeTopic === t ? "bg-white/20 text-white" : "bg-surface-container text-muted"
                  )}>{TOPIC_COUNTS[i]}</span>
                </button>
              ))}
              <div className="h-px bg-outline-variant my-2" />
              <button className="w-full text-left px-3 py-2 rounded-xl text-sm text-primary font-medium hover:bg-surface-dim transition-colors duration-150 flex items-center gap-2">
                <Plus size={14} /> Thêm chủ đề
              </button>
            </div>
          </motion.aside>

          {/* Grid */}
          <div className="flex-1">
            {filtered.length === 0 ? (
              <motion.div {...fadeUp} className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center mb-5">
                  <BookOpen size={32} className="text-muted" />
                </div>
                <p className="text-on-surface font-semibold text-lg mb-1">Không tìm thấy tài liệu</p>
                <p className="text-sm text-muted mb-5">Thử thay đổi bộ lọc hoặc tải lên tài liệu mới</p>
                <Button onClick={() => navigate('/upload')}><Plus size={16} /> Tải lên tài liệu</Button>
              </motion.div>
            ) : (
              <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((doc) => (
                  <DocCard key={doc.title} doc={doc} onStudy={() => navigate('/study')} />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function DocCard({ doc, onStudy }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const progressGradient = doc.progress === 100 ? 'from-tertiary to-[#4A8885]' : undefined

  return (
    <motion.div variants={fadeUp}>
      <Card className="group hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-light opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant={doc.type === 'PDF' ? 'default' : 'tertiary'}>{doc.type}</Badge>
              {doc.progress === 100 && <Badge variant="success"><CheckCircle2 size={10} /> Hoàn thành</Badge>}
            </div>
            <div className="relative">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMenuOpen(!menuOpen)}>
                <MoreHorizontal size={14} />
              </Button>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 top-8 z-10 bg-white border border-outline-variant rounded-xl shadow-xl p-1 min-w-32"
                >
                  <button onClick={() => { setMenuOpen(false); onStudy() }} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-surface-dim flex items-center gap-2 text-on-surface transition-colors">
                    <BookOpen size={14} /> Học ngay
                  </button>
                  <button onClick={() => setMenuOpen(false)} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-error-container/30 flex items-center gap-2 text-error transition-colors">
                    <Trash2 size={14} /> Xoá
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-surface-container to-surface-highest flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <BookOpen size={18} className="text-muted" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-on-surface text-sm mb-1 leading-snug group-hover:text-primary transition-colors duration-200">{doc.title}</h3>
              <p className="text-xs text-muted">{doc.chapters} chương · {doc.questions} câu · {doc.date}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted font-medium">Tiến độ học</span>
              <span className={cn("font-bold", doc.progress === 100 ? "text-tertiary" : "text-primary")}>{doc.progress}%</span>
            </div>
            <Progress value={doc.progress} indicatorClassName={progressGradient && `bg-gradient-to-r ${progressGradient}`} />
          </div>

          <Button className="w-full" size="sm" onClick={onStudy}>
            {doc.progress === 100 ? 'Ôn tập lại' : 'Học ngay'} <BookOpen size={14} />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
