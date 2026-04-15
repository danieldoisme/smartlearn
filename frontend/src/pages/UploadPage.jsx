import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

const STEPS = ['Chọn file', 'Phân loại', 'Xử lý AI']

const AI_STEPS = [
  { label: 'Đọc file', done: true },
  { label: 'Phân tích chương', done: true },
  { label: 'Tạo câu hỏi', done: false, active: true },
]

export default function UploadPage() {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef()
  const navigate = useNavigate()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const handleFileChange = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0])
  }

  const simulateAI = () => {
    setProcessing(true)
    setTimeout(() => { setProcessing(false); setDone(true) }, 2000)
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#492b17] mb-6">Tải lên tài liệu</h1>

        {/* Stepper */}
        <div className="flex items-center mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`flex flex-col items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  i < step ? 'bg-[#4a672e] border-[#4a672e] text-white'
                  : i === step ? 'bg-[#924c28] border-[#924c28] text-white'
                  : 'bg-white border-[#d6a98c] text-[#9a7259]'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${i === step ? 'text-[#924c28]' : 'text-[#9a7259]'}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < step ? 'bg-[#4a672e]' : 'bg-[#d6a98c]'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#ffeade] shadow-sm p-8">
          {/* Step 0 */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold text-[#492b17] mb-2">Chọn file tài liệu</h2>
              <p className="text-sm text-[#9a7259] mb-6">Hỗ trợ PDF và DOCX, tối đa 50MB</p>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                  dragging ? 'border-[#924c28] bg-[#ffeade]' : 'border-[#d6a98c] hover:border-[#924c28] hover:bg-[#fff8f5]'
                }`}>
                <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />
                <div className="text-5xl mb-4">📤</div>
                <p className="font-semibold text-[#492b17] mb-1">Kéo thả file vào đây</p>
                <p className="text-sm text-[#9a7259]">hoặc <span className="text-[#924c28] font-medium">chọn từ máy tính</span></p>
              </div>
              {file && (
                <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-[#fff1ea] border border-[#ffeade]">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-sm font-medium text-[#492b17]">{file.name}</p>
                      <p className="text-xs text-[#9a7259]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="text-[#a73b21] text-lg hover:opacity-70">✕</button>
                </div>
              )}
              <button disabled={!file} onClick={() => setStep(1)}
                className="w-full mt-6 py-3 rounded-xl bg-[#924c28] text-white font-semibold text-sm hover:bg-[#7a3e1f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Tiếp theo →
              </button>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-[#492b17] mb-2">Phân loại tài liệu</h2>
              <p className="text-sm text-[#9a7259] mb-6">Giúp hệ thống tổ chức thư viện của bạn</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#492b17] mb-1.5">Tên tài liệu</label>
                  <input defaultValue={file?.name?.replace(/\.[^.]+$/, '')}
                    className="w-full px-4 py-3 rounded-xl border border-[#d6a98c] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#924c28]/30 focus:border-[#924c28]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#492b17] mb-1.5">Chủ đề</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-[#d6a98c] bg-white text-sm text-[#492b17] focus:outline-none focus:ring-2 focus:ring-[#924c28]/30 focus:border-[#924c28]">
                    <option>Chọn chủ đề...</option>
                    <option>Cơ sở dữ liệu</option>
                    <option>Lập trình Python</option>
                    <option>Toán rời rạc</option>
                    <option>Mạng máy tính</option>
                    <option>+ Tạo chủ đề mới</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#492b17] mb-1.5">Mô tả <span className="text-[#9a7259] font-normal">(tuỳ chọn)</span></label>
                  <textarea rows={3} placeholder="Mô tả ngắn về nội dung tài liệu..."
                    className="w-full px-4 py-3 rounded-xl border border-[#d6a98c] bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#924c28]/30 focus:border-[#924c28] placeholder-[#d6a98c]" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(0)}
                  className="flex-1 py-3 rounded-xl border border-[#d6a98c] text-[#7b573f] font-semibold text-sm hover:bg-[#fff1ea] transition-colors">
                  ← Quay lại
                </button>
                <button onClick={() => { setStep(2); simulateAI() }}
                  className="flex-1 py-3 rounded-xl bg-[#924c28] text-white font-semibold text-sm hover:bg-[#7a3e1f] transition-colors">
                  Xử lý AI →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="text-center">
              <h2 className="text-lg font-bold text-[#492b17] mb-2">Xử lý bằng AI</h2>
              <p className="text-sm text-[#9a7259] mb-8">Hệ thống đang phân tích và tạo câu hỏi...</p>
              <div className="space-y-4 text-left mb-8">
                {AI_STEPS.map((s, i) => (
                  <div key={s.label} className={`flex items-center gap-4 p-4 rounded-xl ${
                    done || (processing && i < 2) ? 'bg-[#d9fcb2]' : processing && i === 2 ? 'bg-[#ffeade]' : 'bg-[#fff1ea]'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      done || (processing && i < 2) ? 'bg-[#4a672e] text-white' : processing && i === 2 ? 'bg-[#924c28] text-white animate-spin' : 'bg-[#d6a98c] text-white'
                    }`}>
                      {done || (processing && i < 2) ? '✓' : processing && i === 2 ? '⟳' : i + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${
                        done || (processing && i < 2) ? 'text-[#4a672e]' : 'text-[#492b17]'
                      }`}>{s.label}</p>
                      {(done || (processing && i < 2)) && <p className="text-xs text-[#9a7259]">Hoàn thành</p>}
                      {processing && i === 2 && <p className="text-xs text-[#924c28]">Đang xử lý...</p>}
                    </div>
                  </div>
                ))}
              </div>
              {done && (
                <div>
                  <div className="p-5 rounded-2xl bg-[#d9fcb2] border border-[#4a672e]/20 mb-6">
                    <p className="text-3xl font-bold text-[#4a672e] mb-1">8 chương · 120 câu hỏi</p>
                    <p className="text-sm text-[#4a672e]">Tài liệu đã sẵn sàng để học</p>
                  </div>
                  <button onClick={() => navigate('/study')}
                    className="w-full py-3 rounded-xl bg-[#924c28] text-white font-semibold hover:bg-[#7a3e1f] transition-colors">
                    Bắt đầu học ngay 🚀
                  </button>
                </div>
              )}
              {processing && (
                <div className="w-full h-2 bg-[#ffeade] rounded-full overflow-hidden">
                  <div className="h-2 bg-[#924c28] rounded-full animate-pulse" style={{ width: '66%' }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
