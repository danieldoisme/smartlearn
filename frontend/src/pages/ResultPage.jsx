import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

const WRONG = [
  {
    question: 'Cú pháp nào dùng để lấy các bản ghi duy nhất trong SQL?',
    userAnswer: 'SELECT UNIQUE', correct: 'SELECT DISTINCT',
  },
  {
    question: 'Dạng chuẩn nào loại bỏ phụ thuộc bắc cầu?',
    userAnswer: '2NF', correct: '3NF',
  },
  {
    question: 'Khoá ngoại (Foreign Key) dùng để làm gì?',
    userAnswer: 'Tăng tốc truy vấn', correct: 'Đảm bảo tính toàn vẹn tham chiếu',
  },
]

const STATS = [
  { label: 'Đúng', value: '15', sub: '75%', color: 'bg-[#d9fcb2] text-[#4a672e]', icon: '✅' },
  { label: 'Sai', value: '3', sub: '15%', color: 'bg-[#ffd0b5] text-[#a73b21]', icon: '❌' },
  { label: 'Bỏ qua', value: '2', sub: '10%', color: 'bg-[#ffdfa0] text-[#7a5a01]', icon: '⏭️' },
  { label: 'Thời gian', value: '12\'45"', sub: 'phút', color: 'bg-[#ffeade] text-[#924c28]', icon: '⏱️' },
]

export default function ResultPage() {
  const navigate = useNavigate()

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl mx-auto">
        {/* Hero */}
        <div className="text-center bg-white rounded-2xl border border-[#ffeade] shadow-sm p-8 mb-6">
          <div className="text-6xl mb-3">🏆</div>
          <h1 className="text-3xl font-bold text-[#492b17] mb-1">Hoàn thành!</h1>
          <p className="text-[#9a7259]">Chương 4: Truy vấn SQL nâng cao</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STATS.map(s => (
            <div key={s.label} className={`rounded-2xl p-4 text-center ${s.color}`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-80">{s.label}</p>
              <p className="text-xs opacity-60">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Donut chart */}
        <div className="bg-white rounded-2xl border border-[#ffeade] shadow-sm p-6 mb-6 flex items-center gap-8">
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ffeade" strokeWidth="3.8" />
              {/* correct 75% */}
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#4a672e" strokeWidth="3.8"
                strokeDasharray="75 25" strokeLinecap="round" />
              {/* wrong 15% */}
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#a73b21" strokeWidth="3.8"
                strokeDasharray="15 85" strokeDashoffset="-75" strokeLinecap="round" />
              {/* skip 10% */}
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fda278" strokeWidth="3.8"
                strokeDasharray="10 90" strokeDashoffset="-90" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-[#492b17]">75%</span>
              <span className="text-xs text-[#9a7259]">đúng</span>
            </div>
          </div>
          <div className="space-y-2">
            {[['#4a672e','Đúng','15 câu (75%)'],['#a73b21','Sai','3 câu (15%)'],['#fda278','Bỏ qua','2 câu (10%)']].map(([c,l,v]) => (
              <div key={l} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c }} />
                <span className="text-sm text-[#492b17] font-medium">{l}</span>
                <span className="text-xs text-[#9a7259]">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wrong answers */}
        <div className="bg-white rounded-2xl border border-[#ffeade] shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-[#492b17] mb-4">Câu trả lời chưa đúng</h2>
          <div className="space-y-4">
            {WRONG.map((w, i) => (
              <div key={i} className="p-4 rounded-xl bg-[#fff1ea] border border-[#ffeade]">
                <p className="text-sm font-medium text-[#492b17] mb-3">{w.question}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-[#ffd0b5] border border-[#a73b21]/20">
                    <p className="text-xs font-semibold text-[#a73b21] mb-0.5">ĐÁP ÁN CỦA BẠN</p>
                    <p className="text-sm text-[#a73b21]">{w.userAnswer}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#d9fcb2] border border-[#4a672e]/20">
                    <p className="text-xs font-semibold text-[#4a672e] mb-0.5">ĐÁP ÁN ĐÚNG</p>
                    <p className="text-sm text-[#4a672e]">{w.correct}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => navigate('/study')}
            className="flex-1 py-3 rounded-xl bg-[#924c28] text-white font-semibold text-sm hover:bg-[#7a3e1f] transition-colors">
            Ôn tập câu sai
          </button>
          <button onClick={() => navigate('/study')}
            className="flex-1 py-3 rounded-xl border-2 border-[#924c28] text-[#924c28] font-semibold text-sm hover:bg-[#fff1ea] transition-colors">
            Học chương tiếp
          </button>
          <button onClick={() => navigate('/library')}
            className="flex-1 py-3 rounded-xl text-[#7b573f] font-semibold text-sm hover:bg-[#fff1ea] transition-colors">
            Về thư viện
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
