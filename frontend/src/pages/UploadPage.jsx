import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, X, Check, BookOpen, Search, Sparkles, ArrowLeft, ArrowRight, Loader2, PartyPopper,
} from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const STEPS = ['Chọn file', 'Phân loại', 'Xử lý AI']
const AI_STEPS = [
  { label: 'Đọc file & trích xuất', icon: BookOpen },
  { label: 'Phân tích chương & cấu trúc', icon: Search },
  { label: 'Tạo câu hỏi bằng AI', icon: Sparkles },
]

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

export default function UploadPage() {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef()
  const navigate = useNavigate()

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]) }
  const handleFileChange = (e) => { if (e.target.files[0]) setFile(e.target.files[0]) }
  const simulateAI = () => { setProcessing(true); setTimeout(() => { setProcessing(false); setDone(true) }, 2500) }

  return (
    <AppLayout>
      <div className="p-10 max-w-2xl mx-auto">
        <motion.div {...fadeUp}>
          <h1 className="text-2xl font-bold text-on-surface mb-2">Tải lên tài liệu</h1>
          <p className="text-sm text-muted mb-10">Upload tài liệu PDF/DOCX để AI tự động tạo câu hỏi ôn tập</p>
        </motion.div>

        {/* Stepper */}
        <motion.div {...fadeUp} className="flex items-center mb-12">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
                  i < step ? "bg-tertiary border-tertiary text-on-tertiary shadow-md shadow-tertiary/20"
                    : i === step ? "bg-primary border-primary text-on-primary shadow-lg shadow-primary/25 scale-110"
                    : "bg-white border-outline-variant text-muted"
                )}>
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span className={cn("text-xs mt-2 font-medium", i === step ? "text-primary font-semibold" : i < step ? "text-tertiary" : "text-muted")}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-3 mb-6">
                  <div className="h-0.5 rounded-full bg-surface-container overflow-hidden">
                    <div className={cn("h-0.5 rounded-full transition-all duration-700 ease-out", i < step ? "bg-tertiary w-full" : "bg-outline-variant w-0")} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </motion.div>

        <Card>
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {/* Step 0 */}
              {step === 0 && (
                <motion.div key="step0" {...fadeUp}>
                  <h2 className="text-lg font-bold text-on-surface mb-1">Chọn file tài liệu</h2>
                  <p className="text-sm text-muted mb-6">Hỗ trợ PDF và DOCX, tối đa 50MB</p>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-300",
                      dragging ? "border-primary bg-primary-container/15 scale-[1.02]" : "border-outline-variant hover:border-primary-light hover:bg-surface-dim"
                    )}
                  >
                    <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-surface-container to-surface-highest flex items-center justify-center mx-auto mb-4">
                      <Upload size={28} className="text-muted" />
                    </div>
                    <p className="font-semibold text-on-surface mb-1">Kéo thả file vào đây</p>
                    <p className="text-sm text-muted">hoặc <span className="text-primary font-semibold cursor-pointer hover:underline underline-offset-2">chọn từ máy tính</span></p>
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <Badge variant="outline">PDF</Badge>
                      <Badge variant="outline">DOCX</Badge>
                      <span className="text-xs text-muted">≤ 50MB</span>
                    </div>
                  </div>
                  {file && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="mt-5 flex items-center justify-between p-4 rounded-xl bg-surface-dim border border-outline-variant">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container to-primary flex items-center justify-center shadow-md">
                          <FileText size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{file.name}</p>
                          <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="text-error hover:bg-error-container/30">
                        <X size={16} />
                      </Button>
                    </motion.div>
                  )}
                  <Button disabled={!file} onClick={() => setStep(1)} className="w-full mt-6" size="lg">
                    Tiếp theo <ArrowRight size={16} />
                  </Button>
                </motion.div>
              )}

              {/* Step 1 */}
              {step === 1 && (
                <motion.div key="step1" {...fadeUp}>
                  <h2 className="text-lg font-bold text-on-surface mb-1">Phân loại tài liệu</h2>
                  <p className="text-sm text-muted mb-6">Giúp hệ thống tổ chức thư viện của bạn tốt hơn</p>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-1.5">Tên tài liệu</label>
                      <Input defaultValue={file?.name?.replace(/\.[^.]+$/, '')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-1.5">Chủ đề</label>
                      <select className="flex h-11 w-full rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface transition-all duration-200 hover:border-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                        <option>Chọn chủ đề...</option>
                        <option>Cơ sở dữ liệu</option>
                        <option>Lập trình Python</option>
                        <option>Toán rời rạc</option>
                        <option>Mạng máy tính</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-1.5">Mô tả <span className="text-muted font-normal">(tuỳ chọn)</span></label>
                      <textarea rows={3} placeholder="Mô tả ngắn về nội dung tài liệu..."
                        className="flex w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-outline-variant transition-all duration-200 hover:border-muted" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-7">
                    <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                      <ArrowLeft size={16} /> Quay lại
                    </Button>
                    <Button onClick={() => { setStep(2); simulateAI() }} className="flex-1">
                      Xử lý AI <Sparkles size={16} />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <motion.div key="step2" {...fadeUp} className="text-center">
                  <h2 className="text-lg font-bold text-on-surface mb-1">Xử lý bằng AI</h2>
                  <p className="text-sm text-muted mb-8">Hệ thống đang phân tích tài liệu và tạo câu hỏi tự động</p>

                  <div className="space-y-3 text-left mb-8">
                    {AI_STEPS.map((s, i) => {
                      const isDone = done || (processing && i < 2)
                      const isActive = processing && i === 2
                      const Icon = s.icon
                      return (
                        <motion.div key={s.label}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.15, duration: 0.3 }}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border",
                            isDone ? "bg-tertiary-container/30 border-tertiary/15" : isActive ? "bg-primary-container/20 border-primary/15" : "bg-surface-container/50 border-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                            isDone ? "bg-tertiary text-on-tertiary shadow-md shadow-tertiary/20" : isActive ? "bg-primary text-on-primary shadow-lg shadow-primary/25" : "bg-surface-highest text-muted"
                          )}>
                            {isDone ? <Check size={16} /> : isActive ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                          </div>
                          <div className="flex-1">
                            <p className={cn("text-sm font-semibold", isDone ? "text-tertiary" : isActive ? "text-primary" : "text-muted")}>{s.label}</p>
                            {isDone && <p className="text-xs text-tertiary/70">Hoàn thành</p>}
                            {isActive && <p className="text-xs text-primary">Đang xử lý...</p>}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {done && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                      <div className="p-6 rounded-2xl border border-tertiary/15 mb-6 bg-gradient-to-br from-tertiary-container to-secondary-container">
                        <PartyPopper size={36} className="text-tertiary mx-auto mb-3" />
                        <p className="text-3xl font-bold text-tertiary mb-1">8 chương · 120 câu hỏi</p>
                        <p className="text-sm text-tertiary/80">Tài liệu đã sẵn sàng để học!</p>
                      </div>
                      <Button onClick={() => navigate('/study')} className="w-full" size="lg">
                        Bắt đầu học ngay <ArrowRight size={16} />
                      </Button>
                    </motion.div>
                  )}

                  {processing && <Progress value={66} className="mt-4" />}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
