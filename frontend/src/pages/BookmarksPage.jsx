import { useState } from 'react'
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
import { mockBookmarks, mockNotes, mockStudyQuestions, mockExamQuestions, mockChapters, mockDocuments, getTopicName } from '@/mocks'

// Build view data from normalized Bookmark + Question + Chapter + Document models
const allQuestions = [...mockStudyQuestions, ...mockExamQuestions]

const questionBookmarks = mockBookmarks
  .filter((bm) => bm.questionId !== null)
  .map((bm) => {
    const question = allQuestions.find((q) => q.id === bm.questionId)
    const chapter = mockChapters.find((ch) => ch.id === bm.chapterId || ch.id === question?.chapterId)
    const doc = mockDocuments.find((d) => d.id === chapter?.documentId)
    return {
      ...bm,
      questionContent: question?.content ?? '',
      documentTitle: doc?.title ?? '',
      chapterTitle: chapter?.title ?? '',
    }
  })

const pageBookmarks = mockBookmarks
  .filter((bm) => bm.questionId === null && bm.pageNumber !== null)
  .map((bm) => {
    // Page bookmarks reference a page number; resolve document via chapter or direct association
    const doc = mockDocuments[0] // simplified for mock
    return {
      ...bm,
      documentTitle: doc?.title ?? '',
      chapterTitle: 'Chương liên quan',
    }
  })

const enrichedNotes = mockNotes.map((note) => {
  const question = allQuestions.find((q) => q.id === note.questionId)
  const bookmark = mockBookmarks.find((bm) => bm.id === note.bookmarkId)
  const doc = mockDocuments[0] // simplified for mock
  return {
    ...note,
    questionContent: question?.content ?? null,
    documentTitle: doc?.title ?? '',
    pageNumber: bookmark?.pageNumber ?? null,
  }
})

function formatRelativeTime(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hôm nay'
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
  const [editingNote, setEditingNote] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const startEdit = (note) => {
    setEditingNote(note.id)
    setEditContent(note.content)
  }

  const cancelEdit = () => {
    setEditingNote(null)
    setEditContent('')
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
            Ghi chú ({enrichedNotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <motion.div variants={itemAnim} className="space-y-2">
            {questionBookmarks.map((bm) => (
              <Card key={bm.id} className="p-4 group">
                <CardContent className="flex items-start gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0 mt-0.5">
                    <HelpCircle className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 vn-text">{bm.questionContent}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary">{bm.documentTitle}</Badge>
                      <span className="text-xs text-slate-400">{bm.chapterTitle}</span>
                      <span className="text-xs text-slate-400">· {formatRelativeTime(bm.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <BookOpen className="h-3.5 w-3.5" />
                    </Button>
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
          </motion.div>
        </TabsContent>

        <TabsContent value="pages">
          <motion.div variants={itemAnim} className="space-y-2">
            {pageBookmarks.map((bm) => (
              <Card key={bm.id} className="p-4 group">
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 shrink-0">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{bm.documentTitle}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{bm.chapterTitle}</span>
                      <Badge variant="secondary">Trang {bm.pageNumber}</Badge>
                      <span className="text-xs text-slate-400">· {formatRelativeTime(bm.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
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
          </motion.div>
        </TabsContent>

        <TabsContent value="notes">
          <motion.div variants={itemAnim} className="space-y-2">
            {enrichedNotes.map((note) => (
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
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="glass-input w-full px-3 py-2 text-sm text-slate-800 rounded-xl resize-none"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={cancelEdit}>
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
                            <Badge variant="secondary">{note.documentTitle}</Badge>
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
          </motion.div>
        </TabsContent>
      </Tabs>

      {questionBookmarks.length === 0 && pageBookmarks.length === 0 && enrichedNotes.length === 0 && (
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
            <Button variant="danger" onClick={() => setDeleteTarget(null)}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
