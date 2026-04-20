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
  const { data: bookmarks = [], isLoading: bmLoading } = useBookmarks()
  const { data: notes = [], isLoading: notesLoading } = useNotes()
  const deleteBookmark = useDeleteBookmark()
  const deleteNote = useDeleteNote()
  const updateNote = useUpdateNote()

  const [editingNote, setEditingNote] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const questionBookmarks = bookmarks.filter((bm) => bm.questionId != null)
  const pageBookmarks = bookmarks.filter(
    (bm) => bm.questionId == null && bm.pageNumber != null,
  )

  const ITEMS_PER_PAGE = 5

  const [pageQ, setPageQ] = useState(1)
  const totalPagesQ = Math.ceil(questionBookmarks.length / ITEMS_PER_PAGE)
  const actualPageQ = pageQ > 1 && pageQ > totalPagesQ ? Math.max(1, totalPagesQ) : pageQ
  const paginatedQ = questionBookmarks.slice((actualPageQ - 1) * ITEMS_PER_PAGE, actualPageQ * ITEMS_PER_PAGE)

  const [pageP, setPageP] = useState(1)
  const totalPagesP = Math.ceil(pageBookmarks.length / ITEMS_PER_PAGE)
  const actualPageP = pageP > 1 && pageP > totalPagesP ? Math.max(1, totalPagesP) : pageP
  const paginatedP = pageBookmarks.slice((actualPageP - 1) * ITEMS_PER_PAGE, actualPageP * ITEMS_PER_PAGE)

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
    } else {
      await deleteBookmark.mutateAsync(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  if (bmLoading || notesLoading) {
    return <div className="max-w-4xl py-16 text-center text-slate-500">Đang tải...</div>
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl">
      <motion.div variants={itemAnim}>
        <h1 className="text-2xl font-bold text-slate-900">Bookmarks & Ghi chú</h1>
        <p className="text-slate-500 text-sm mt-1">Quản lý đánh dấu và ghi chú cá nhân</p>
      </motion.div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">
            <HelpCircle className="h-4 w-4" />
            Câu hỏi ({questionBookmarks.length})
          </TabsTrigger>
          <TabsTrigger value="pages">
            <Bookmark className="h-4 w-4" />
            Trang ({pageBookmarks.length})
          </TabsTrigger>
          <TabsTrigger value="notes">
            <StickyNote className="h-4 w-4" />
            Ghi chú ({notes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <motion.div variants={itemAnim} className="space-y-2">
            {paginatedQ.map((bm) => (
              <Card key={bm.id} className="p-4 group">
                <CardContent className="flex items-start gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0 mt-0.5">
                    <HelpCircle className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 vn-text">
                      {bm.questionContent || 'Câu hỏi đã đánh dấu'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {bm.documentTitle && <Badge variant="secondary">{bm.documentTitle}</Badge>}
                      {bm.chapterTitle && (
                        <span className="text-xs text-slate-400">{bm.chapterTitle}</span>
                      )}
                      <span className="text-xs text-slate-400">· {formatRelativeTime(bm.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {buildQuestionHref(bm) ? (
                      <Link to={buildQuestionHref(bm)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <BookOpen className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    ) : buildDocumentHref(bm) ? (
                      <Link to={buildDocumentHref(bm)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <BookOpen className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => setDeleteTarget({ type: 'bookmark', id: bm.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {questionBookmarks.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-10">
                Chưa có câu hỏi nào được đánh dấu.
              </p>
            )}
            {totalPagesQ > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 font-medium">
                  Trang {actualPageQ} / {totalPagesQ} ({(actualPageQ - 1) * ITEMS_PER_PAGE + 1} - {Math.min(actualPageQ * ITEMS_PER_PAGE, questionBookmarks.length)} / {questionBookmarks.length})
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPageQ(Math.max(1, actualPageQ - 1))} disabled={actualPageQ <= 1}>
                    <ChevronLeft className="h-4 w-4" /> Trước
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPageQ(Math.min(totalPagesQ, actualPageQ + 1))} disabled={actualPageQ >= totalPagesQ}>
                    Sau <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="pages">
          <motion.div variants={itemAnim} className="space-y-2">
            {paginatedP.map((bm) => (
              <Card key={bm.id} className="p-4 group">
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 shrink-0">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {bm.documentTitle || 'Tài liệu'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {bm.chapterTitle && (
                        <span className="text-xs text-slate-500">{bm.chapterTitle}</span>
                      )}
                      <Badge variant="secondary">Trang {bm.pageNumber}</Badge>
                      <span className="text-xs text-slate-400">· {formatRelativeTime(bm.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {buildDocumentHref(bm) && (
                      <Link to={buildDocumentHref(bm)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => setDeleteTarget({ type: 'bookmark', id: bm.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {pageBookmarks.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-10">
                Chưa có trang nào được đánh dấu.
              </p>
            )}
            {totalPagesP > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 font-medium">
                  Trang {actualPageP} / {totalPagesP} ({(actualPageP - 1) * ITEMS_PER_PAGE + 1} - {Math.min(actualPageP * ITEMS_PER_PAGE, pageBookmarks.length)} / {pageBookmarks.length})
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPageP(Math.max(1, actualPageP - 1))} disabled={actualPageP <= 1}>
                    <ChevronLeft className="h-4 w-4" /> Trước
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPageP(Math.min(totalPagesP, actualPageP + 1))} disabled={actualPageP >= totalPagesP}>
                    Sau <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="notes">
          <motion.div variants={itemAnim} className="space-y-2">
            {paginatedN.map((note) => (
              <Card key={note.id} className="p-4 group">
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
                          <p className="text-sm text-slate-700 vn-text leading-relaxed">{note.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {note.documentTitle && (
                              <Badge variant="secondary">{note.documentTitle}</Badge>
                            )}
                            {note.questionContent ? (
                              <span className="text-xs text-slate-400 truncate max-w-[200px]">{note.questionContent}</span>
                            ) : note.pageNumber ? (
                              <span className="text-xs text-slate-400">Trang {note.pageNumber}</span>
                            ) : null}
                            <span className="text-xs text-slate-400">· {formatRelativeTime(note.updatedAt)}</span>
                          </div>
                        </>
                      )}
                    </div>
                    {editingNote !== note.id && (
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {buildQuestionHref(note) ? (
                          <Link to={buildQuestionHref(note)}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <BookOpen className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        ) : buildDocumentHref(note) ? (
                          <Link to={buildDocumentHref(note)}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        ) : null}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(note)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
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
              <p className="text-center text-sm text-slate-400 py-10">
                Chưa có ghi chú nào.
              </p>
            )}
            {totalPagesN > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 font-medium">
                  Trang {actualPageN} / {totalPagesN} ({(actualPageN - 1) * ITEMS_PER_PAGE + 1} - {Math.min(actualPageN * ITEMS_PER_PAGE, notes.length)} / {notes.length})
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPageN(Math.max(1, actualPageN - 1))} disabled={actualPageN <= 1}>
                    <ChevronLeft className="h-4 w-4" /> Trước
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPageN(Math.min(totalPagesN, actualPageN + 1))} disabled={actualPageN >= totalPagesN}>
                    Sau <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {bookmarks.length === 0 && notes.length === 0 && (
        <div className="text-center py-16">
          <Bookmark className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Chưa có bookmark hay ghi chú nào</p>
          <p className="text-xs text-slate-400 mt-1">Đánh dấu câu hỏi trong khi học tập để xem lại sau</p>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'note'
                ? 'Bạn có chắc muốn xóa ghi chú này? Hành động không thể hoàn tác.'
                : 'Bạn có chắc muốn xóa bookmark này?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={deleteBookmark.isPending || deleteNote.isPending}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
