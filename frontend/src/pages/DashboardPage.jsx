import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

const STATS = [
  { label: 'Tài liệu đã tải', value: '12', icon: '📄', color: 'bg-[#ffeade] text-[#924c28]' },
  { label: 'Câu đã học', value: '348', icon: '✅', color: 'bg-[#d9fcb2] text-[#4a672e]' },
  { label: 'Chuỗi ngày học', value: '7 🔥', icon: '🗓️', color: 'bg-[#ffdfa0] text-[#7a5a01]' },
  { label: 'Điểm trung bình', value: '82%', icon: '🏆', color: 'bg-[#ffeade] text-[#924c28]' },
]

const RECENT_DOCS = [
  { title: 'Giáo trình Cơ sở dữ liệu', chapters: 8, questions: 120, progress: 65, topic: 'CSDL' },
  { title: 'Lập trình Python nâng cao', chapters: 12, questions: 180, progress: 40, topic: 'Python' },
  { title: 'Toán rời rạc ứng dụng', chapters: 6, questions: 90, progress: 80, topic: 'Toán' },
]

const ACTIVITY = [
  { time: 'Hôm nay, 10:30', action: 'Hoàn thành chương 4 — CSDL', score: '18/20', ok: true },
  { time: 'Hôm qua, 15:00', action: 'Ôn tập câu sai — Python', score: '12/15', ok: true },
  { time: 'Hôm qua, 09:00', action: 'Kiểm tra tổng hợp — Toán', score: '75%', ok: false },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#492b17]">Xin chào, Đức Thành! 🌱</h1>
          <p className="text-[#9a7259] mt-1 text-sm capitalize">{today}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#ffeade] shadow-sm">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-xl mb-3 ${s.color}`}>
                {s.icon}
              </div>
              <p className="text-2xl font-bold text-[#492b17]">{s.value}</p>
              <p className="text-xs text-[#9a7259] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tiếp tục học */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#492b17]">Tiếp tục học</h2>
            <button onClick={() => navigate('/library')}
              className="text-sm text-[#924c28] font-medium hover:underline">Xem tất cả →</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RECENT_DOCS.map((doc) => (
              <div key={doc.title} className="bg-white rounded-2xl p-5 border border-[#ffeade] shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-[#ffeade] text-[#924c28]">{doc.topic}</span>
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="font-semibold text-[#492b17] text-sm mb-1 leading-snug">{doc.title}</h3>
                <p className="text-xs text-[#9a7259] mb-3">{doc.chapters} chương · {doc.questions} câu hỏi</p>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-[#9a7259] mb-1">
                    <span>Tiến độ</span><span>{doc.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#ffeade]">
                    <div className="h-1.5 rounded-full bg-[#924c28] transition-all" style={{ width: `${doc.progress}%` }} />
                  </div>
                </div>
                <button onClick={() => navigate('/study')}
                  className="w-full py-2 rounded-xl bg-[#924c28] text-white text-xs font-semibold hover:bg-[#7a3e1f] transition-colors">
                  Tiếp tục
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity */}
          <div className="bg-white rounded-2xl p-5 border border-[#ffeade] shadow-sm">
            <h2 className="text-base font-bold text-[#492b17] mb-4">Hoạt động gần đây</h2>
            <div className="space-y-3">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${a.ok ? 'bg-[#4a672e]' : 'bg-[#a73b21]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#492b17] font-medium truncate">{a.action}</p>
                    <p className="text-xs text-[#9a7259]">{a.time}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0 ${
                    a.ok ? 'bg-[#d9fcb2] text-[#4a672e]' : 'bg-[#ffeade] text-[#a73b21]'
                  }`}>{a.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ôn tập gợi ý */}
          <div className="bg-white rounded-2xl p-5 border border-[#ffeade] shadow-sm">
            <h2 className="text-base font-bold text-[#492b17] mb-4">Gợi ý ôn tập 💡</h2>
            <div className="space-y-3">
              {[
                { chapter: 'Chương 3 — Chuẩn hoá CSDL', wrong: 5 },
                { chapter: 'Chương 7 — Hàm trong Python', wrong: 3 },
                { chapter: 'Chương 2 — Lý thuyết đồ thị', wrong: 7 },
              ].map((r) => (
                <div key={r.chapter} className="flex items-center justify-between p-3 rounded-xl bg-[#fff1ea] border border-[#ffeade]">
                  <div>
                    <p className="text-sm font-medium text-[#492b17]">{r.chapter}</p>
                    <p className="text-xs text-[#9a7259]">{r.wrong} câu sai cần ôn</p>
                  </div>
                  <button onClick={() => navigate('/study')}
                    className="px-3 py-1.5 rounded-lg bg-[#924c28] text-white text-xs font-semibold hover:bg-[#7a3e1f] transition-colors">
                    Ôn ngay
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
