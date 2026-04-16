import { useState, useRef } from 'react'
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

const topics = ['CSDL', 'OOP', 'Network', 'DSA', 'OS', 'AI']

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedTopic, setSelectedTopic] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const fileRef = useRef(null)
  const navigate = useNavigate()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.type === 'application/pdf' || dropped.name.endsWith('.docx'))) {
      setFile(dropped)
    }
  }

  const handleFileSelect = (e) => {
    const selected = e.target.files[0]
    if (selected) setFile(selected)
  }

  const handleUpload = () => {
    setUploading(true)
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => navigate('/library'), 800)
          return 100
        }
        return prev + Math.random() * 15 + 5
      })
    }, 300)
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
                  <span>{uploadProgress >= 100 ? 'Đang phân tích cấu trúc...' : 'Đang tải lên...'}</span>
                  <span>{Math.min(Math.round(uploadProgress), 100)}%</span>
                </div>
              </div>
            )}

            {!uploading && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Chủ đề (tùy chọn)</label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {topics.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTopic(selectedTopic === t ? '' : t)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                          selectedTopic === t
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'text-slate-500 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {t}
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
                    <Button variant="outline" size="sm" disabled={!newTopic}>
                      <FolderPlus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Button onClick={handleUpload} className="w-full" size="lg">
                  <Upload className="h-4 w-4" />
                  Tải lên và phân tích
                </Button>
              </>
            )}

            {uploadProgress >= 100 && (
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
