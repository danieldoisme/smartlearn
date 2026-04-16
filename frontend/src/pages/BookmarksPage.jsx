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

const mockBookmarks = {
  questions: [
    { id: 1, content: 'Khóa chính (Primary Key) có đặc điểm nào?', document: 'Giáo trình CSDL', chapter: 'Chương 2', createdAt: '2 ngày trước' },
    { id: 2, content: 'Phép toán nào kết hợp hai quan hệ dựa trên điều kiện?', document: 'Giáo trình CSDL', chapter: 'Chương 3', createdAt: '3 ngày trước' },
    { id: 3, content: 'Tính chất ACID trong giao dịch CSDL gồm những gì?', document: 'Giáo trình CSDL', chapter: 'Chương 7', createdAt: '5 ngày trước' },
    { id: 4, content: 'Đa hình (Polymorphism) trong OOP là gì?', document: 'Lập trình OOP', chapter: 'Chương 4', createdAt: '1 tuần trước' },
  ],
  pages: [
    { id: 1, document: 'Giáo trình CSDL', chapter: 'Chương 3: Đại số quan hệ', pageNumber: 52, createdAt: '1 ngày trước' },
    { id: 2, document: 'Mạng máy tính', chapter: 'Chương 2: Mô hình OSI', pageNumber: 28, createdAt: '4 ngày trước' },
    { id: 3, document: 'Lập trình OOP', chapter: 'Chương 5: Design Patterns', pageNumber: 89, createdAt: '1 tuần trước' },
  ],
}

const mockNotes = [
  { id: 1, content: 'Khóa chính không được NULL và giá trị phải duy nhất. Cần nhớ phân biệt với khóa ứng viên.', questionContent: 'Khóa chính (Primary Key) có đặc điểm nào?', document: 'Giáo trình CSDL', createdAt: '2 ngày trước', updatedAt: '1 ngày trước' },
  { id: 2, content: 'ACID = Atomicity + Consistency + Isolation + Durability. Distribution KHÔNG phải tính chất ACID.', questionContent: 'Tính chất ACID trong giao dịch CSDL', document: 'Giáo trình CSDL', createdAt: '5 ngày trước', updatedAt: '5 ngày trước' },
  { id: 3, content: 'Phép kết tự nhiên (Natural Join) tự động ghép theo các thuộc tính cùng tên.', questionContent: null, document: 'Giáo trình CSDL', page: 52, createdAt: '1 ngày trước', updatedAt: '1 ngày trước' },
  { id: 4, content: 'Polymorphism: cùng 1 phương thức, hành vi khác nhau tùy đối tượng. Ví dụ: draw() cho Circle vs Rectangle.', questionContent: 'Đa hình (Polymorphism) trong OOP là gì?', document: 'Lập trình OOP', createdAt: '1 tuần trước', updatedAt: '6 ngày trước' },
]

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
            Câu hỏi ({mockBookmarks.questions.length})
          </TabsTrigger>
          <TabsTrigger value="pages">
            <Bookmark className="h-4 w-4" />
            Trang ({mockBookmarks.pages.length})
          </TabsTrigger>
          <TabsTrigger value="notes">
            <StickyNote className="h-4 w-4" />
            Ghi chú ({mockNotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <motion.div variants={itemAnim} className="space-y-2">
            {mockBookmarks.questions.map((bm) => (
              <Card key={bm.id} className="p-4 group">
                <CardContent className="flex items-start gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 shrink-0 mt-0.5">
                    <HelpCircle className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 vn-text">{bm.content}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary">{bm.document}</Badge>
                      <span className="text-xs text-slate-400">{bm.chapter}</span>
                      <span className="text-xs text-slate-400">· {bm.createdAt}</span>
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
            {mockBookmarks.pages.map((bm) => (
              <Card key={bm.id} className="p-4 group">
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 shrink-0">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{bm.document}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{bm.chapter}</span>
                      <Badge variant="secondary">Trang {bm.pageNumber}</Badge>
                      <span className="text-xs text-slate-400">· {bm.createdAt}</span>
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
            {mockNotes.map((note) => (
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
                            <Badge variant="secondary">{note.document}</Badge>
                            {note.questionContent ? (
                              <span className="text-xs text-slate-400 truncate max-w-[200px]">{note.questionContent}</span>
                            ) : (
                              <span className="text-xs text-slate-400">Trang {note.page}</span>
                            )}
                            <span className="text-xs text-slate-400">· {note.updatedAt}</span>
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

      {mockBookmarks.questions.length === 0 && mockBookmarks.pages.length === 0 && mockNotes.length === 0 && (
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
