import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  PencilLine,
  Loader2,
  Sparkles,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { QuestionType, QuestionTypeLabel } from '@/models'
import {
  useDocumentDetail,
  useGenerateQuestions,
  useUpdateDocumentStructure,
} from '@/api/document'

const questionTypes = [
  { value: QuestionType.MCQ, label: QuestionTypeLabel[QuestionType.MCQ] },
  { value: QuestionType.MULTI, label: QuestionTypeLabel[QuestionType.MULTI] },
  { value: QuestionType.FILL, label: QuestionTypeLabel[QuestionType.FILL] },
  { value: 'mixed', label: 'Hỗn hợp' },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

function formatFileSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function getChapterStatus(ch) {
  if (ch.questionCount > 0 && ch.answeredCount >= ch.questionCount) return 'completed'
  if (ch.answeredCount > 0) return 'in_progress'
  return 'not_started'
}

export default function DocumentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const docId = id ? Number(id) : null
  const { data: doc, isLoading, isError } = useDocumentDetail(docId)
  const generateQuestions = useGenerateQuestions(docId)
  const updateStructure = useUpdateDocumentStructure(docId)

  const [showGenerate, setShowGenerate] = useState(false)
  const [showStructureEditor, setShowStructureEditor] = useState(false)
  const [generateChapter, setGenerateChapter] = useState(null)
  const [genConfig, setGenConfig] = useState({ type: 'mixed', count: 10 })
  const [generateMessage, setGenerateMessage] = useState('')
  const [structureDraft, setStructureDraft] = useState([])

  if (isLoading) {
    return (
      <div className="max-w-4xl py-16 text-center text-slate-500">
        Đang tải tài liệu...
      </div>
    )
  }

  if (isError || !doc) {
    return (
      <div className="max-w-4xl py-16 text-center space-y-3">
        <p className="text-slate-600">Không tìm thấy tài liệu.</p>
        <Button variant="outline" onClick={() => navigate('/library')}>
          Về thư viện
        </Button>
      </div>
    )
  }

  const chapters = doc.chapters || []
  const totalAnswered = doc.totalAnswered ?? 0
  const totalQuestions = doc.totalQuestions ?? 0
  const overallProgress =
    totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0
  const canEditStructure = totalQuestions === 0

  const handleGenerate = async () => {
    if (!generateChapter) return
    setGenerateMessage('')
    try {
      const result = await generateQuestions.mutateAsync({
        chapterId: generateChapter.id,
        questionType: genConfig.type,
        count: genConfig.count,
      })
      setGenerateMessage(`Đã tạo ${result.createdCount} câu hỏi.`)
      setShowGenerate(false)
    } catch (err) {
      setGenerateMessage(
        err?.response?.data?.detail || 'Không thể tạo câu hỏi cho chương này.'
      )
    }
  }

  const openStructureEditor = () => {
    setGenerateMessage('')
    setStructureDraft(
      chapters.length
        ? chapters.map((chapter) => ({
            title: chapter.title,
            contentText: chapter.contentText || '',
            pageStart: chapter.pageStart ?? '',
            pageEnd: chapter.pageEnd ?? '',
          }))
        : [
            {
              title: doc.title || 'Phần 1',
              contentText: '',
              pageStart: '',
              pageEnd: '',
            },
          ]
    )
    setShowStructureEditor(true)
  }

  const updateDraftItem = (index, patch) => {
    setStructureDraft((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    )
  }

  const addDraftItem = () => {
    setStructureDraft((prev) => [
      ...prev,
      {
        title: `Phần ${prev.length + 1}`,
        contentText: '',
        pageStart: '',
        pageEnd: '',
      },
    ])
  }

  const removeDraftItem = (index) => {
    setStructureDraft((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleSaveStructure = async () => {
    try {
      const chaptersPayload = structureDraft.map((item) => ({
        title: item.title.trim(),
        contentText: item.contentText.trim(),
        pageStart: item.pageStart === '' ? null : Number(item.pageStart),
        pageEnd: item.pageEnd === '' ? null : Number(item.pageEnd),
      }))
      await updateStructure.mutateAsync({ chapters: chaptersPayload })
      setGenerateMessage('Đã cập nhật cấu trúc chương thành công.')
      setShowStructureEditor(false)
    } catch (err) {
      setGenerateMessage(
        err?.response?.data?.detail || 'Không thể cập nhật cấu trúc tài liệu.'
      )
    }
  }

  const statusIcon = (status) => {
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    if (status === 'in_progress') return <Loader2 className="h-4 w-4 text-primary-500" />
    return <Circle className="h-4 w-4 text-slate-300" />
  }

  const statusLabel = (status) => {
    if (status === 'completed') return <Badge variant="success">Hoàn thành</Badge>
    if (status === 'in_progress') return <Badge variant="info">Đang học</Badge>
    return <Badge variant="secondary">Chưa học</Badge>
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl">
      <motion.div variants={item} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/library')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{doc.title}</h1>
            {doc.topicName && <Badge variant="secondary">{doc.topicName}</Badge>}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {chapters.length} chương · {totalQuestions} câu hỏi · {formatFileSize(doc.fileSize)}
          </p>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card className="p-5">
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">Tiến độ tổng thể</span>
              <span className="text-sm font-bold text-slate-900">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2.5" />
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
              <span>{totalAnswered}/{totalQuestions} câu đã làm</span>
              <span>
                {chapters.filter((c) => getChapterStatus(c) === 'completed').length}/{chapters.length} chương hoàn thành
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Mục lục</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={openStructureEditor}
            disabled={!canEditStructure}
            title={
              canEditStructure
                ? 'Chỉnh sửa cấu trúc chương'
                : 'Chỉ có thể chỉnh cấu trúc trước khi tạo câu hỏi'
            }
          >
            <PencilLine className="h-3.5 w-3.5" />
            Chỉnh cấu trúc
          </Button>
        </div>

        {generateMessage && (
          <div className="mb-4 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            {generateMessage}
          </div>
        )}

        <div className="space-y-2">
          {chapters.length === 0 && (
            <Card className="p-6">
              <CardContent>
                <p className="text-sm text-slate-500 text-center">
                  Tài liệu chưa có chương nào.
                </p>
              </CardContent>
            </Card>
          )}
          {chapters.map((ch) => {
            const status = getChapterStatus(ch)
            return (
              <Card key={ch.id} className="p-4 group">
                <CardContent>
                  <div className="flex items-center gap-4">
                    {statusIcon(status)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-slate-800">{ch.title}</h3>
                        {statusLabel(status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {ch.pageStart != null && ch.pageEnd != null && (
                          <span>Trang {ch.pageStart}–{ch.pageEnd}</span>
                        )}
                        <span>{ch.questionCount} câu hỏi</span>
                        {ch.answeredCount > 0 && (
                          <>
                            <span>{ch.answeredCount}/{ch.questionCount} đã làm</span>
                            <span className={ch.accuracy >= 75 ? 'text-emerald-600' : ch.accuracy >= 60 ? 'text-amber-600' : 'text-red-600'}>
                              {ch.accuracy}% chính xác
                            </span>
                          </>
                        )}
                      </div>
                      {ch.answeredCount > 0 && ch.questionCount > 0 && (
                        <Progress value={(ch.answeredCount / ch.questionCount) * 100} className="mt-2 h-1" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {ch.questionCount === 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setGenerateChapter(ch); setShowGenerate(true) }}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Tạo câu hỏi
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setGenerateChapter(ch); setShowGenerate(true) }}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Tạo thêm
                          </Button>
                          <Link to={`/study?chapterId=${ch.id}`}>
                            <Button size="sm">
                              <Play className="h-3.5 w-3.5" />
                              Học
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </motion.div>

      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-500" />
              Tạo câu hỏi tự động
            </DialogTitle>
            <DialogDescription>
              {generateChapter?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Loại câu hỏi</label>
              <div className="flex gap-2 flex-wrap">
                {questionTypes.map((qt) => (
                  <button
                    key={qt.value}
                    onClick={() => setGenConfig({ ...genConfig, type: qt.value })}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      genConfig.type === qt.value
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Số lượng câu hỏi</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGenConfig({ ...genConfig, count: n })}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      genConfig.count === n
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {n} câu
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowGenerate(false)}>Hủy</Button>
            <Button onClick={handleGenerate} disabled={generateQuestions.isPending}>
              {generateQuestions.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Tạo câu hỏi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStructureEditor} onOpenChange={setShowStructureEditor}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cấu trúc tài liệu</DialogTitle>
            <DialogDescription>
              Điều chỉnh tên chương và nội dung đã tách trước khi tạo câu hỏi.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            {!canEditStructure && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Tài liệu đã có câu hỏi. Hiện chỉ hỗ trợ chỉnh cấu trúc trước khi tạo câu hỏi.
              </div>
            )}

            {structureDraft.map((chapter, index) => (
              <Card key={`${index}-${chapter.title}`} className="p-4">
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Chương {index + 1}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDraftItem(index)}
                      disabled={structureDraft.length <= 1 || !canEditStructure}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Input
                    value={chapter.title}
                    onChange={(e) =>
                      updateDraftItem(index, { title: e.target.value })
                    }
                    disabled={!canEditStructure}
                    placeholder="Tên chương"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      min="1"
                      value={chapter.pageStart}
                      onChange={(e) =>
                        updateDraftItem(index, { pageStart: e.target.value })
                      }
                      disabled={!canEditStructure}
                      placeholder="Trang bắt đầu"
                    />
                    <Input
                      type="number"
                      min="1"
                      value={chapter.pageEnd}
                      onChange={(e) =>
                        updateDraftItem(index, { pageEnd: e.target.value })
                      }
                      disabled={!canEditStructure}
                      placeholder="Trang kết thúc"
                    />
                  </div>

                  <textarea
                    value={chapter.contentText}
                    onChange={(e) =>
                      updateDraftItem(index, { contentText: e.target.value })
                    }
                    disabled={!canEditStructure}
                    rows={6}
                    className="glass-input w-full rounded-xl px-4 py-3 text-sm text-slate-800"
                    placeholder="Nội dung chương"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={addDraftItem}
              disabled={!canEditStructure}
            >
              <Plus className="h-4 w-4" />
              Thêm chương
            </Button>
            <Button variant="ghost" onClick={() => setShowStructureEditor(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveStructure}
              disabled={!canEditStructure || updateStructure.isPending}
            >
              {updateStructure.isPending ? 'Đang lưu...' : 'Lưu cấu trúc'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
