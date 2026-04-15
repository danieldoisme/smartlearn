import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

const QUESTIONS = [
  { id: 1, content: 'Phát biểu nào sau đây đúng về ACID trong hệ thống CSDL?', options: ['Atomicity, Consistency, Isolation, Durability', 'Availability, Consistency, Integrity, Durability', 'Atomicity, Concurrency, Integrity, Data', 'Tất cả đều sai'] },
  { id: 2, content: 'Câu lệnh SQL nào dùng để tạo bảng mới?', options: ['CREATE TABLE', 'INSERT TABLE', 'NEW TABLE', 'MAKE TABLE'] },
  { id: 3, content: 'Index trong CSDL có tác dụng gì?', options: ['Tăng dung lượng', 'Tăng tốc truy vấn', 'Mã hoá dữ liệu', 'Sao lưu tự động'] },
  { id: 4, content: 'Mô hình quan hệ được đề xuất bởi ai?', options: ['Bill Gates', 'E.F. Codd', 'Alan Turing', 'Dennis Ritchie'] },
  { id: 5, content: 'Dạng chuẩn 1NF yêu cầu điều gì?', options: ['Loại bỏ phụ thuộc hàm', 'Mỗi ô chứa giá trị đơn', 'Khóa chính phức hợp', 'Không có NULL'] },
]
const TOTAL = 20

export default function ExamPage() {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState(new Set())
  const [paused, setPaused] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [timeLeft, setTimeLeft] = useState(38 * 60 + 42)
  const navigate = useNavigate()

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setTimeLeft(s => s > 0 ? s - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [paused])

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const secs = (timeLeft % 60).toString().padStart(2, '0')
  const timerRed = timeLeft < 300

  const q = QUESTIONS[current % QUESTIONS.length]
  const unanswered = TOTAL - Object.keys(answers).length

  const boxStyle = (i) => {
    if (i === current) return 'ring-2 ring-[#924c28] ring-offset-1 bg-[#ffeade] text-[#924c28] font-bold'
    if (answers[i] !== undefined) return 'bg-[#924c28] text-white font-bold'
    return 'bg-white border border-[#d6a98c] text-[#9a7259]'
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-[#ffeade] shrink-0">
          <div>
            <p className="text-xs text-[#9a7259]">Bài kiểm tra tổng hợp</p>
            <h2 className="text-sm font-bold text-[#492b17]">Kiểm tra tổng hợp — Cơ sở dữ liệu</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-3xl font-bold tabular-nums px-4 py-2 rounded-xl ${
              timerRed ? 'text-[#a73b21] bg-[#ffd0b5] animate-pulse' : 'text-[#492b17] bg-[#fff1ea]'
            }`}>
              {mins}:{secs}
            </div>
            <button onClick={() => setPaused(!paused)}
              className="px-4 py-2 rounded-xl border border-[#d6a98c] text-sm font-medium text-[#7b573f] hover:bg-[#fff1ea] transition-colors">
              {paused ? '▶ Tiếp tục' : '⏸ Tạm dừng'}
            </button>
            <button onClick={() => setShowDialog(true)}
              className="px-4 py-2 rounded-xl bg-[#924c28] text-white text-sm font-semibold hover:bg-[#7a3e1f] transition-colors">
              Nộp bài
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Question */}
          <div className="flex-1 flex flex-col overflow-auto p-8">
            <div className="bg-white rounded-2xl border border-[#ffeade] shadow-sm p-8 flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#ffeade] text-[#924c28]">
                  Câu {current + 1} / {TOTAL}
                </span>
                <button onClick={() => setFlagged(prev => {
                  const s = new Set(prev); s.has(current) ? s.delete(current) : s.add(current); return s
                })}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    flagged.has(current) ? 'bg-[#ffdfa0] text-[#7a5a01]' : 'bg-[#fff1ea] text-[#9a7259] hover:bg-[#ffdfa0]'
                  }`}>
                  🚩 Đánh dấu xem lại
                </button>
              </div>
              <p className="text-base font-semibold text-[#492b17] mb-8 leading-relaxed">{q.content}</p>
              <div className="space-y-3">
                {q.options.map((opt, idx) => (
                  <button key={idx}
                    onClick={() => setAnswers(prev => ({ ...prev, [current]: idx }))}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                      answers[current] === idx
                        ? 'border-[#924c28] bg-[#ffeade] text-[#924c28]'
                        : 'border-[#d6a98c] bg-white hover:border-[#924c28] hover:bg-[#fff1ea]'
                    }`}>
                    <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                      answers[current] === idx ? 'border-[#924c28] bg-[#924c28] text-white' : 'border-[#d6a98c] text-[#9a7259]'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer nav */}
            <div className="flex justify-between mt-4">
              <button disabled={current === 0} onClick={() => setCurrent(c => c - 1)}
                className="px-5 py-2.5 rounded-xl border border-[#d6a98c] text-sm font-medium text-[#7b573f] disabled:opacity-40 hover:bg-[#fff1ea] transition-colors">
                ← Câu trước
              </button>
              <button disabled={current >= TOTAL - 1} onClick={() => setCurrent(c => c + 1)}
                className="px-5 py-2.5 rounded-xl bg-[#924c28] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#7a3e1f] transition-colors">
                Câu sau →
              </button>
            </div>
          </div>

          {/* Right panel */}
          <aside className="w-56 shrink-0 bg-white border-l border-[#ffeade] p-4 overflow-auto">
            <h3 className="text-xs font-semibold text-[#9a7259] uppercase tracking-wide mb-3">Danh sách câu hỏi</h3>
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {Array.from({ length: TOTAL }, (_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`w-full aspect-square rounded-lg text-xs transition-all ${boxStyle(i)}`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="text-xs text-[#9a7259] space-y-1.5">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#924c28]" /><span>Đã làm</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-white border border-[#d6a98c]" /><span>Chưa làm</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#ffdfa0]" /><span>Đánh dấu</span></div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-[#fff1ea]">
              <p className="text-xs text-[#9a7259]">Chưa làm</p>
              <p className="text-lg font-bold text-[#492b17]">{unanswered} câu</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Submit dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
            <div className="text-4xl text-center mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-[#492b17] text-center mb-2">Xác nhận nộp bài?</h3>
            <p className="text-sm text-[#9a7259] text-center mb-6">
              Bạn còn <strong className="text-[#a73b21]">{unanswered} câu</strong> chưa trả lời.
              Sau khi nộp bạn không thể chỉnh sửa.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDialog(false)}
                className="flex-1 py-3 rounded-xl border border-[#d6a98c] text-[#7b573f] font-semibold text-sm hover:bg-[#fff1ea] transition-colors">
                Hủy
              </button>
              <button onClick={() => navigate('/result')}
                className="flex-1 py-3 rounded-xl bg-[#924c28] text-white font-semibold text-sm hover:bg-[#7a3e1f] transition-colors">
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
