import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

const QUESTIONS = [
  {
    id: 1, type: 'Trắc nghiệm',
    content: 'Trong SQL, mệnh đề nào dùng để lọc kết quả sau khi GROUP BY?',
    options: ['WHERE', 'HAVING', 'FILTER', 'ORDER BY'],
    correct: 1,
    source: 'Mệnh đề HAVING được sử dụng sau GROUP BY để lọc các nhóm, khác với WHERE lọc trước khi nhóm.',
    page: 142,
  },
  {
    id: 2, type: 'Trắc nghiệm',
    content: 'Khoá chính (Primary Key) trong cơ sở dữ liệu quan hệ có đặc điểm gì?',
    options: ['Có thể NULL', 'Duy nhất và NOT NULL', 'Cho phép trùng lặp', 'Chỉ là số nguyên'],
    correct: 1,
    source: 'Khoá chính phải duy nhất và không được phép NULL, đảm bảo nhận dạng mỗi bản ghi.',
    page: 58,
  },
  {
    id: 3, type: 'Chọn nhiều',
    content: 'Các dạng chuẩn hoá nào phổ biến trong thiết kế CSDL?',
    options: ['1NF', '2NF', '3NF', 'BCNF'],
    correct: 1,
    source: 'Các dạng chuẩn 1NF, 2NF, 3NF và BCNF được dùng để loại bỏ dư thừa dữ liệu.',
    page: 98,
  },
]

const TOTAL = 20

export default function StudyPage() {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [bookmarked, setBookmarked] = useState(new Set())
  const navigate = useNavigate()

  const q = QUESTIONS[current % QUESTIONS.length]
  const answered = answers[current]

  const handleAnswer = (idx) => {
    if (answered !== undefined) return
    setAnswers(prev => ({ ...prev, [current]: idx }))
  }

  const getOptionStyle = (idx) => {
    if (answered === undefined) {
      return 'border-[#d6a98c] bg-white hover:bg-[#fff1ea] hover:border-[#924c28] cursor-pointer'
    }
    if (idx === q.correct) return 'border-[#4a672e] bg-[#d9fcb2] text-[#4a672e]'
    if (idx === answered && idx !== q.correct) return 'border-[#a73b21] bg-[#ffeade] text-[#a73b21]'
    return 'border-[#d6a98c] bg-white opacity-50'
  }

  const statusColor = (i) => {
    if (answers[i] === undefined) return 'bg-[#ffeade] text-[#9a7259]'
    const qi = QUESTIONS[i % QUESTIONS.length]
    return answers[i] === qi.correct ? 'bg-[#4a672e] text-white' : 'bg-[#a73b21] text-white'
  }

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Main */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-[#ffeade]">
            <div>
              <p className="text-xs text-[#9a7259]">Cơ sở dữ liệu</p>
              <h2 className="text-sm font-bold text-[#492b17]">Chương 4: Truy vấn SQL nâng cao</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[#924c28]">Câu {current + 1} / {TOTAL}</span>
              <button onClick={() => setBookmarked(prev => {
                const s = new Set(prev)
                s.has(current) ? s.delete(current) : s.add(current)
                return s
              })}
                className={`p-2 rounded-lg transition-colors ${bookmarked.has(current) ? 'bg-[#ffdfa0] text-[#7a5a01]' : 'bg-[#fff1ea] text-[#9a7259] hover:bg-[#ffdfa0]'}`}>
                🔖
              </button>
              <button className="px-3 py-1.5 rounded-lg text-sm text-[#7b573f] border border-[#d6a98c] hover:bg-[#fff1ea]"
                onClick={() => setAnswers(prev => ({ ...prev, [current]: -1 }))}>
                Bỏ qua
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-[#ffeade]">
            <div className="h-1 bg-[#924c28] transition-all" style={{ width: `${((current + 1) / TOTAL) * 100}%` }} />
          </div>

          {/* Question */}
          <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
            <div className="bg-white rounded-2xl border border-[#ffeade] shadow-sm p-8">
              <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-[#ffeade] text-[#924c28] mb-4">
                {q.type}
              </span>
              <p className="text-base font-semibold text-[#492b17] mb-6 leading-relaxed">{q.content}</p>

              <div className="grid grid-cols-1 gap-3 mb-6">
                {q.options.map((opt, idx) => (
                  <button key={idx} onClick={() => handleAnswer(idx)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-sm font-medium text-left transition-all ${getOptionStyle(idx)}`}>
                    <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                      answered === undefined ? 'border-[#d6a98c] text-[#9a7259]'
                      : idx === q.correct ? 'border-[#4a672e] bg-[#4a672e] text-white'
                      : idx === answered ? 'border-[#a73b21] bg-[#a73b21] text-white'
                      : 'border-[#d6a98c] text-[#9a7259]'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>

              {answered !== undefined && answered !== -1 && (
                <div className="p-4 rounded-xl bg-[#fff1ea] border-l-4 border-[#924c28] mb-4">
                  <p className="text-sm text-[#492b17] mb-1">{q.source}</p>
                  <p className="text-xs text-[#9a7259]">Nguồn: Giáo trình Cơ sở dữ liệu, trang {q.page}</p>
                </div>
              )}

              <div className="flex justify-between">
                <button disabled={current === 0} onClick={() => setCurrent(c => c - 1)}
                  className="px-5 py-2.5 rounded-xl border border-[#d6a98c] text-sm font-medium text-[#7b573f] disabled:opacity-40 hover:bg-[#fff1ea] transition-colors">
                  ← Câu trước
                </button>
                <button
                  onClick={() => {
                    if (current >= TOTAL - 1) navigate('/result')
                    else setCurrent(c => c + 1)
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#924c28] text-white text-sm font-semibold hover:bg-[#7a3e1f] transition-colors">
                  {current >= TOTAL - 1 ? 'Hoàn thành ✓' : 'Câu tiếp theo →'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <aside className="w-52 shrink-0 bg-white border-l border-[#ffeade] flex flex-col p-4">
          <h3 className="text-xs font-semibold text-[#9a7259] uppercase tracking-wide mb-3">Tiến độ bài học</h3>
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {Array.from({ length: TOTAL }, (_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-full aspect-square rounded-lg text-xs font-bold transition-all ${
                  i === current
                    ? 'ring-2 ring-[#924c28] ring-offset-1 bg-[#ffeade] text-[#924c28]'
                    : statusColor(i)
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="text-xs text-[#9a7259] space-y-1.5 mb-4">
            {[['bg-[#4a672e]','Đúng'],['bg-[#a73b21]','Sai'],['bg-[#ffdfa0]','Bỏ qua'],['bg-[#ffeade]','Chưa làm']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${c}`} />
                <span>{l}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto">
            <button onClick={() => navigate('/result')}
              className="w-full py-2.5 rounded-xl bg-[#924c28] text-white text-xs font-semibold hover:bg-[#7a3e1f] transition-colors">
              Nộp bài
            </button>
          </div>
        </aside>
      </div>
    </AppLayout>
  )
}
