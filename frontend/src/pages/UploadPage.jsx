import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Upload,
  FileText,
  File,
  X,
  Check,
  CloudUpload,
  FolderPlus,
  Trash2,
  Plus,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getErrorMessage } from '@/lib/utils'
import {
  useCreateTopic,
  usePreviewDocument,
  useTopics,
  useUploadDocument,
} from '@/api/library'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Không thể đọc file'))
    reader.readAsDataURL(file)
  })
}

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [fileBase64, setFileBase64] = useState('')
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadPhase, setUploadPhase] = useState('idle')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const navigate = useNavigate()

  const { data: topics = [] } = useTopics()
  const createTopic = useCreateTopic()
  const previewDocument = usePreviewDocument()
  const uploadDocument = useUploadDocument()
  const uploading = uploadDocument.isPending
  const previewing = previewDocument.isPending

  useEffect(() => {
    let timer
    if (uploadPhase === 'processing') {
      timer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) return 95
          const diff = 95 - prev
          const step = Math.max(diff * 0.06, 0.3)
          return Math.min(prev + step, 95)
        })
      }, 120)
    }
    return () => clearInterval(timer)
  }, [uploadPhase])
  const parserModeLabel = preview?.parserMode === 'ai'
    ? 'AI parser'
    : preview?.parserMode === 'fallback'
      ? 'Parser dự phòng'
      : 'Parser'
  const previewWarnings = preview?.warnings ?? []

  const acceptFile = (candidate) => {
    if (!candidate) return
    const isValidType =
      candidate.type === 'application/pdf' || candidate.name.endsWith('.docx')
    if (!isValidType) {
      setError('Chỉ hỗ trợ file PDF hoặc DOCX.')
      return
    }
    if (candidate.size > MAX_UPLOAD_BYTES) {
      const mb = MAX_UPLOAD_BYTES / (1024 * 1024)
      setError(`Kích thước file vượt quá giới hạn ${mb} MB.`)
      return
    }
    setError('')
    setFile(candidate)
    setFileBase64('')
    setPreview(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    acceptFile(e.dataTransfer.files[0])
  }

  const handleFileSelect = (e) => {
    acceptFile(e.target.files[0])
  }

  const handlePreview = async () => {
    if (!file) return
    setError('')
    try {
      const fileContentBase64 = fileBase64 || (await fileToBase64(file))
      if (!fileBase64) setFileBase64(fileContentBase64)
      const data = await previewDocument.mutateAsync({
        fileName: file.name,
        fileContentBase64,
      })
      setPreview(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể phân tích file.'))
    }
  }

  const resetFile = () => {
    setFile(null)
    setFileBase64('')
    setPreview(null)
    setUploadProgress(0)
    setUploadPhase('idle')
  }

  const handleCreateTopic = async () => {
    const name = newTopic.trim()
    if (!name) return
    setError('')
    try {
      const topic = await createTopic.mutateAsync({ name })
      setSelectedTopic(String(topic.id))
      setNewTopic('')
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tạo chủ đề mới.'))
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setError('')
    setUploadProgress(0)
    setUploadPhase('uploading')
    try {
      const fileContentBase64 = fileBase64 || (await fileToBase64(file))
      if (!fileBase64) setFileBase64(fileContentBase64)

      const onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const pct = (progressEvent.loaded / progressEvent.total) * 70
          setUploadProgress(pct)
          if (progressEvent.loaded >= progressEvent.total) {
            setUploadPhase('processing')
          }
        }
      }

      const data = await uploadDocument.mutateAsync({
        fileName: file.name,
        fileContentBase64,
        topicId: selectedTopic ? Number(selectedTopic) : null,
        topicName: newTopic.trim() || null,
        chapters: preview.sections,
        onUploadProgress,
      })
      setUploadPhase('done')
      setUploadProgress(100)
      setTimeout(() => navigate(`/document/${data.id}`), 700)
    } catch (err) {
      setError(getErrorMessage(err, 'Tải lên thất bại.'))
      setUploadProgress(0)
      setUploadPhase('idle')
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tải lên tài liệu</h1>
        <p className="text-slate-500 text-sm mt-1">Hỗ trợ file PDF và DOCX</p>
      </div>

      {!file ? (
        <Card
          className={`p-12 border-2 border-dashed transition-all cursor-pointer ${
            dragOver
              ? 'border-primary-400 bg-primary-50/50'
              : '!border-slate-200 hover:border-primary-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 mb-4">
              <CloudUpload className="h-8 w-8 text-primary-500" />
            </div>
            <p className="text-base font-medium text-slate-800 mb-1">
              Kéo thả file vào đây
            </p>
            <p className="text-sm text-slate-500 mb-4">hoặc nhấn để chọn file</p>
            <div className="flex gap-2">
              <Badge variant="secondary">PDF</Badge>
              <Badge variant="secondary">DOCX</Badge>
            </div>
          </CardContent>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleFileSelect}
          />
        </Card>
      ) : (
        <Card className="p-6">
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 shrink-0">
                {file.name.endsWith('.pdf') ? (
                  <FileText className="h-6 w-6 text-primary-600" />
                ) : (
                  <File className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={resetFile}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {(uploading || uploadPhase === 'done') && (
              <div className="space-y-2">
                <Progress value={Math.min(uploadProgress, 100)} className="h-2" />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>
                    {uploadPhase === 'done'
                      ? 'Hoàn tất!'
                      : uploadPhase === 'processing'
                        ? 'Đang xử lý trên máy chủ...'
                        : 'Đang tải lên...'}
                  </span>
                  <span>{Math.min(Math.round(uploadProgress), 100)}%</span>
                </div>
              </div>
            )}

            {!uploading && !preview && (
              <>
                {error && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                <Button
                  onClick={handlePreview}
                  className="w-full"
                  size="lg"
                  disabled={previewing}
                >
                  {previewing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {previewing ? 'AI đang phân tích...' : 'Phân tích bằng AI trước khi lưu'}
                </Button>
              </>
            )}

            {!uploading && preview && (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Xem trước cấu trúc do AI đề xuất
                      </p>
                      <p className="text-xs text-slate-500">
                        {preview.chapterCount} chương · {preview.totalChars.toLocaleString('vi-VN')} ký tự
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{preview.fileType?.toUpperCase?.()}</Badge>
                      <Badge variant={preview.parserMode === 'ai' ? 'default' : 'secondary'}>
                        {parserModeLabel}
                      </Badge>
                    </div>
                  </div>
                  {(preview.reviewRequired || previewWarnings.length > 0) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 space-y-1">
                      <p className="font-medium">
                        {preview.parserMode === 'ai'
                          ? 'AI cần bạn kiểm tra lại cấu trúc trước khi lưu.'
                          : 'Hệ thống đang dùng parser dự phòng. Nên kiểm tra lại cấu trúc.'}
                      </p>
                      {typeof preview.confidence === 'number' && (
                        <p>Độ tin cậy AI: {Math.round(preview.confidence * 100)}%</p>
                      )}
                      {previewWarnings.map((warning, idx) => (
                        <p key={`${warning}-${idx}`}>• {warning}</p>
                      ))}
                    </div>
                  )}
                  <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                    {preview.sections.map((section, index) => (
                      <Card key={`section-${index}`} className="p-4">
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-slate-800">
                              Chương {index + 1}
                            </h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newSections = preview.sections.filter((_, i) => i !== index);
                                setPreview({ ...preview, sections: newSections, chapterCount: newSections.length });
                              }}
                              disabled={preview.sections.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                            <span>
                              {(section.contentChars || 0).toLocaleString('vi-VN')} ký tự
                            </span>
                            <span>Ô nội dung có thể cuộn hoặc kéo giãn để xem hết</span>
                          </div>

                          <Input
                            id={`chapter-title-${index}`}
                            name={`chapter-title-${index}`}
                            aria-label="Tên chương"
                            value={section.title || ''}
                            onChange={(e) => {
                              const newSections = [...preview.sections];
                              newSections[index] = { ...section, title: e.target.value };
                              setPreview({ ...preview, sections: newSections });
                            }}
                            placeholder="Tên chương"
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              id={`chapter-start-${index}`}
                              name={`chapter-start-${index}`}
                              aria-label="Trang bắt đầu"
                              type="number"
                              min="1"
                              value={section.pageStart ?? ''}
                              onChange={(e) => {
                                const newSections = [...preview.sections];
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                newSections[index] = { ...section, pageStart: val };
                                setPreview({ ...preview, sections: newSections });
                              }}
                              placeholder="Trang bắt đầu"
                            />
                            <Input
                              id={`chapter-end-${index}`}
                              name={`chapter-end-${index}`}
                              aria-label="Trang kết thúc"
                              type="number"
                              min="1"
                              value={section.pageEnd ?? ''}
                              onChange={(e) => {
                                const newSections = [...preview.sections];
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                newSections[index] = { ...section, pageEnd: val };
                                setPreview({ ...preview, sections: newSections });
                              }}
                              placeholder="Trang kết thúc"
                            />
                          </div>

                          <textarea
                            id={`chapter-content-${index}`}
                            name={`chapter-content-${index}`}
                            aria-label="Nội dung chương"
                            value={section.contentText || ''}
                            onChange={(e) => {
                              const newSections = [...preview.sections];
                              newSections[index] = { 
                                ...section, 
                                contentText: e.target.value,
                                contentChars: e.target.value.length
                              };
                              setPreview({ ...preview, sections: newSections });
                            }}
                            rows={12}
                            className="glass-input min-h-[16rem] w-full resize-y rounded-xl px-4 py-3 text-sm text-slate-800"
                            placeholder="Nội dung chương"
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newSections = [
                          ...preview.sections,
                          {
                            title: `Chương ${preview.sections.length + 1}`,
                            contentText: '',
                            contentChars: 0,
                            pageStart: null,
                            pageEnd: null
                          }
                        ];
                        setPreview({ ...preview, sections: newSections, chapterCount: newSections.length });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Thêm chương mới
                    </Button>
                  </div>
                  {preview.chapterCount === 0 && (
                    <p className="text-xs text-amber-600">
                      Không trích xuất được nội dung. Kiểm tra lại file.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="new-topic" className="block text-xs font-medium text-slate-600 mb-2">
                    Chủ đề (tùy chọn)
                  </label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {topics.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setSelectedTopic(selectedTopic === String(topic.id) ? '' : String(topic.id))}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                          selectedTopic === String(topic.id)
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'text-slate-500 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {topic.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="new-topic"
                      name="new-topic"
                      placeholder="Hoặc tạo chủ đề mới..."
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!newTopic.trim() || createTopic.isPending}
                      onClick={handleCreateTopic}
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setPreview(null)}
                    disabled={uploading}
                  >
                    Quay lại
                  </Button>
                  <Button
                    onClick={handleUpload}
                    className="flex-1"
                    size="lg"
                    disabled={uploading || preview.chapterCount === 0}
                  >
                    <Upload className="h-4 w-4" />
                    Xác nhận tải lên
                  </Button>
                </div>
              </>
            )}

            {uploadProgress >= 100 && !uploading && !error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-primary-600 text-sm"
              >
                <Check className="h-4 w-4" />
                <span>Hoàn tất! Đang chuyển hướng...</span>
              </motion.div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
