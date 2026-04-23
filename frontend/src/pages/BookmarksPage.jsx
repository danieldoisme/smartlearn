import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bookmark,
  StickyNote,
  FileText,
  Trash2,
  Pencil,
  X,
  Check,
  BookOpen,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useBookmarks,
  useDeleteBookmark,
  useNotes,
  useUpdateNote,
  useDeleteNote,
} from '@/api/bookmarks'

function buildQuestionHref(item) {
  if (!item?.questionId || !item?.chapterId) return null
  const params = new URLSearchParams({
    chapterId: String(item.chapterId),
    mode: 'review',
    questionIds: String(item.questionId),
  })
  return `/study?${params.toString()}`
}

function buildDocumentHref(item) {
  if (!item?.documentId) return null
  const params = new URLSearchParams()
  if (item.chapterId) {
    params.set('focusChapterId', String(item.chapterId))
    params.set('openChapterId', String(item.chapterId))
  }
  return `/document/${item.documentId}${params.toString() ? `?${params.toString()}` : ''}`
}

function formatRelativeTime(isoDate) {
  if (!isoDate) return ''
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return 'Hôm nay'
  if (days === 1) return '1 ngày trước'
  if (days < 7) return `${days} ngày trước`
  if (days < 14) return '1 tuần trước'
  return `${Math.floor(days / 7)} tuần trước`
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function BookmarksPage() {
  const { data: notes = [], isLoading: notesLoading } = useNotes()
  const deleteNote = useDeleteNote()
  const updateNote = useUpdateNote()

  const [editingNote, setEditingNote] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const ITEMS_PER_PAGE = 8

  const [pageN, setPageN] = useState(1)
  const totalPagesN = Math.ceil(notes.length / ITEMS_PER_PAGE)
  const actualPageN = pageN > 1 && pageN > totalPagesN ? Math.max(1, totalPagesN) : pageN
  const paginatedN = notes.slice((actualPageN - 1) * ITEMS_PER_PAGE, actualPageN * ITEMS_PER_PAGE)

  const startEdit = (note) => {
    setEditingNote(note.id)
    setEditContent(note.content)
  }

  const cancelEdit = () => {
    setEditingNote(null)
    setEditContent('')
  }

  const saveEdit = async () => {
    if (!editingNote || !editContent.trim()) {
      cancelEdit()
      return
    }
    await updateNote.mutateAsync({ id: editingNote, content: editContent.trim() })
    cancelEdit()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'note') {
      await deleteNote.mutateAsync(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  if (notesLoading) {
    return <div className="max-w-4xl py-16 text-center text-slate-500">Đang tải...</div>
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl">
      <motion.div variants={itemAnim} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ghi chú cá nhân</h1>
          <p className="text-slate-500 text-sm mt-1">Lưu trữ các kiến thức quan trọng trong quá trình học tập</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <StickyNote className="h-5 w-5 text-blue-600" />
        </div>
      </motion.div>

      <motion.div variants={itemAnim} className="space-y-3">
        {paginatedN.map((note) => (
          <Card key={note.id} className="p-4 group border-slate-200/60 hover:border-blue-200 transition-colors">
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 shrink-0 mt-0.5">
                  <StickyNote className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {editingNote === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        id={`note-edit-${note.id}`}
                        name="noteContent"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="glass-input w-full px-3 py-2 text-sm text-slate-800 rounded-xl resize-none"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} disabled={updateNote.isPending}>
                          <Check className="h-3.5 w-3.5" />
                          Lưu
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          <X className="h-3.5 w-3.5" />
                          Hủy
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-700 vn-text leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {note.documentTitle && (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-medium">
                            {note.documentTitle}
                          </Badge>
                        )}
                        {note.questionContent ? (
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight truncate max-w-[250px]">
                            Câu hỏi: {note.questionContent}
                          </span>
                        ) : note.pageNumber ? (
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Trang {note.pageNumber}</span>
                        ) : null}
                        <span className="text-[10px] text-slate-300 font-bold ml-auto">
                          {formatRelativeTime(note.updatedAt)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {editingNote !== note.id && (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {buildQuestionHref(note) ? (
                      <Link to={buildQuestionHref(note)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary-600">
                          <BookOpen className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    ) : buildDocumentHref(note) ? (
                      <Link to={buildDocumentHref(note)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary-600">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    ) : null}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => startEdit(note)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600"
                      onClick={() => setDeleteTarget({ type: 'note', id: note.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {notes.length === 0 && (
          <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
            <StickyNote className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Chưa có ghi chú nào.</p>
            <p className="text-[10px] text-slate-300 mt-1 uppercase tracking-widest font-bold">Hãy tạo ghi chú trong quá trình học tập</p>
          </div>
        )}
        
        {totalPagesN > 1 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-xs text-slate-400 font-medium">
              Hiển thị {(actualPageN - 1) * ITEMS_PER_PAGE + 1} - {Math.min(actualPageN * ITEMS_PER_PAGE, notes.length)} trong tổng số {notes.length} ghi chú
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={() => setPageN(Math.max(1, actualPageN - 1))} disabled={actualPageN <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPagesN }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPageN(p)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                      p === actualPageN 
                        ? "bg-primary-500 text-white shadow-sm" 
                        : "text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setPageN(Math.min(totalPagesN, actualPageN + 1))} disabled={actualPageN >= totalPagesN}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa ghi chú này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={confirmDelete}
              disabled={deleteNote.isPending}
            >
              {deleteNote.isPending ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
