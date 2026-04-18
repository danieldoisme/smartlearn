import { useRef, useState } from 'react'
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
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  useCreateTopic,
  useTopics,
  useUploadDocument,
} from '@/api/library'

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
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedTopic, setSelectedTopic] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const navigate = useNavigate()

  const { data: topics = [] } = useTopics()
  const createTopic = useCreateTopic()
  const uploadDocument = useUploadDocument()
  const uploading = uploadDocument.isPending

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.type === 'application/pdf' || dropped.name.endsWith('.docx'))) {
      setError('')
      setFile(dropped)
      return
    }
    setError('Chỉ hỗ trợ file PDF hoặc DOCX.')
  }

  const handleFileSelect = (e) => {
    const selected = e.target.files[0]
    if (!selected) return
    if (selected.type === 'application/pdf' || selected.name.endsWith('.docx')) {
      setError('')
      setFile(selected)
      return
    }
    setError('Chỉ hỗ trợ file PDF hoặc DOCX.')
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
      setError(err?.response?.data?.detail || 'Không thể tạo chủ đề mới.')
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setError('')
    setUploadProgress(10)
    try {
      const fileContentBase64 = await fileToBase64(file)
      const data = await uploadDocument.mutateAsync({
        fileName: file.name,
        fileContentBase64,
        topicId: selectedTopic ? Number(selectedTopic) : null,
        topicName: newTopic.trim() || null,
        onUploadProgress: (event) => {
          if (!event.total) return
          setUploadProgress(Math.min(Math.round((event.loaded / event.total) * 100), 100))
        },
      })
      setUploadProgress(100)
      navigate(`/document/${data.id}`)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Tải lên thất bại.')
      setUploadProgress(0)
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
                  onClick={() => setFile(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <Progress value={Math.min(uploadProgress, 100)} className="h-2" />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{uploadProgress >= 100 ? 'Đang hoàn tất...' : 'Đang tải lên và phân tích...'}</span>
                  <span>{Math.min(Math.round(uploadProgress), 100)}%</span>
                </div>
              </div>
            )}

            {!uploading && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
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

                <Button
                  onClick={handleUpload}
                  className="w-full"
                  size="lg"
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" />
                  Tải lên và phân tích
                </Button>
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
