import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search,
  FileText,
  FolderOpen,
  MoreVertical,
  Trash2,
  Pencil,
  BookOpen,
  Plus,
  Grid3X3,
  List,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { mockDocuments, mockTopics, mockChapters, getTopicName, formatFileSize } from '@/mocks'

// Enrich documents with computed view fields (would come from API in production)
const documents = mockDocuments.map((doc) => {
  const chapters = mockChapters.filter((ch) => ch.documentId === doc.id)
  return {
    ...doc,
    topicName: getTopicName(doc.topicId),
    chapterCount: chapters.length || [8, 12, 6, 10, 9, 7][doc.id - 1] || 0,
    questionCount: [64, 120, 48, 85, 72, 56][doc.id - 1] || 0,
    progress: [65, 40, 90, 20, 0, 55][doc.id - 1] || 0,
  }
})

const topicFilters = ['Tất cả', ...mockTopics.map((t) => t.name)]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function LibraryPage() {
  const [search, setSearch] = useState('')
  const [activeTopic, setActiveTopic] = useState('Tất cả')
  const [viewMode, setViewMode] = useState('grid')
  const [deleteDoc, setDeleteDoc] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)

  const filtered = documents.filter((doc) => {
    const matchSearch = doc.title.toLowerCase().includes(search.toLowerCase())
    const matchTopic = activeTopic === 'Tất cả' || doc.topicName === activeTopic
    return matchSearch && matchTopic
  })

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Thư viện tài liệu</h1>
          <p className="text-slate-500 text-sm mt-1">{documents.length} tài liệu</p>
        </div>
        <Link to="/upload">
          <Button>
            <Plus className="h-4 w-4" />
            Tải lên
          </Button>
        </Link>
      </motion.div>

      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Tìm kiếm tài liệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex gap-2 flex-wrap">
        {topicFilters.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTopic(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTopic === t
                ? 'bg-primary-50 text-primary-700 border border-primary-200'
                : 'text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </motion.div>

      {viewMode === 'grid' ? (
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <Card key={doc.id} className="p-5 group relative">
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === doc.id ? null : doc.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen === doc.id && (
                      <div className="absolute right-0 top-8 z-10 w-36 bg-white rounded-xl py-1 shadow-lg border border-slate-200">
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer">
                          <Pencil className="h-3 w-3" /> Đổi tên
                        </button>
                        <button
                          onClick={() => { setDeleteDoc(doc); setMenuOpen(null) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" /> Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-800 mb-1 line-clamp-2">{doc.title}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">{doc.topicName}</Badge>
                  <span className="text-xs text-slate-400">{doc.fileType.toUpperCase()}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span>{doc.chapterCount} chương</span>
                  <span>{doc.questionCount} câu hỏi</span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Progress value={doc.progress} className="flex-1 h-1.5" />
                  <span className="text-xs text-slate-500">{doc.progress}%</span>
                </div>

                <Link to={`/document/${doc.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <BookOpen className="h-3.5 w-3.5" />
                    Xem chi tiết
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={item} className="space-y-2">
          {filtered.map((doc) => (
            <Card key={doc.id} className="p-4">
              <CardContent className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 shrink-0">
                  <FileText className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                  <p className="text-xs text-slate-400">{doc.chapterCount} chương · {doc.questionCount} câu hỏi · {formatFileSize(doc.fileSize)}</p>
                </div>
                <Badge variant="secondary">{doc.topicName}</Badge>
                <div className="flex items-center gap-2 w-32">
                  <Progress value={doc.progress} className="flex-1 h-1.5" />
                  <span className="text-xs text-slate-500">{doc.progress}%</span>
                </div>
                <Link to={`/document/${doc.id}`}>
                  <Button variant="ghost" size="sm">
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Không tìm thấy tài liệu nào</p>
        </div>
      )}

      <Dialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa tài liệu</DialogTitle>
            <DialogDescription>
              Tài liệu &quot;{deleteDoc?.title}&quot; có {deleteDoc?.questionCount} câu hỏi liên kết.
              Xóa tài liệu sẽ xóa toàn bộ câu hỏi đi kèm.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteDoc(null)}>Hủy</Button>
            <Button variant="danger" onClick={() => setDeleteDoc(null)}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
