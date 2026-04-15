import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

const DAILY = [
  { day: 'T2', count: 45 },
  { day: 'T3', count: 80 },
  { day: 'T4', count: 30 },
  { day: 'T5', count: 95 },
  { day: 'T6', count: 60 },
  { day: 'T7', count: 120 },
  { day: 'CN', count: 75 },
]
const MAX_COUNT = 120

const DOCS = [
  { title: 'Giáo trình Cơ sở dữ liệu', chapters: 8, done: 5, accuracy: 78 },
  { title: 'Lập trình Python nâng cao', chapters: 12, done: 5, accuracy: 65 },
  { title: 'Toán rời rạc ứng dụng', chapters: 6, done: 5, accuracy: 88 },
  { title: 'Bài giảng Mạng máy tính', chapters: 10, done: 2, accuracy: 55 },
]

const WEAK = [
  { name: 'Chương 3 — Chuẩn hoá CSDL', accuracy: 42, wrong: 5 },
  { name: 'Chương 7 — Hàm trong Python', accuracy: 53, wrong: 3 },
  { name: 'Chương 2 — Lý thuyết đồ thị', accuracy: 38, wrong: 7 },
]

const RANGES = ['Tuần này', 'Tháng này', 'Tất cả']

export default function ProgressPage() {
  const [range, setRange] = useState('Tuần này')
  const navigate = useNavigate()

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#492b17]">Tiến độ học tập của tôi</h1>
          <div className="flex bg-[#ffeade] rounded-xl p-1 gap-1">
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  range === r ? 'bg-white text-[#924c28] shadow-sm' : 'text-[#7b573f]'
                }`}>{r}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Tổng câu đã học', value: '348', icon: '✅' },
            { label: 'Tỷ lệ đúng tổng', value: '76%', icon: '🎯' },
            { label: 'Chuỗi ngày dài nhất', value: '12 ngày', icon: '🔥' },
            { label: 'Tổng thời gian học', value: '14 giờ', icon: '⏱️' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#ffeade] shadow-sm">
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className="text-2xl font-bold text-[#492b17]">{s.value}</p>
              <p className="text-xs text-[#9a7259] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-2xl border border-[#ffeade] shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-[#492b17] mb-5">Hoạt động 7 ngày gần đây</h2>
          <div className="flex items-end gap-3 h-32">
            {DAILY.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs font-semibold text-[#9a7259]">{d.count}</span>
                <div className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${(d.count / MAX_COUNT) * 100}px`,
                    backgroundColor: d.count === MAX_COUNT ? '#4a672e' : '#924c28',
                    opacity: 0.85,
                  }} />
                <span className="text-xs text-[#9a7259]">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Doc progress */}
          <div className="bg-white rounded-2xl border border-[#ffeade] shadow-sm p-6">
            <h2 className="text-base font-bold text-[#492b17] mb-4">Tiến độ theo tài liệu</h2>
            <div className="space-y-4">
              {DOCS.map(d => (
                <div key={d.title}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-[#492b17] leading-snug flex-1 mr-2">{d.title}</p>
                    <span className={`text-xs font-semibold shrink-0 ${d.accuracy >= 75 ? 'text-[#4a672e]' : d.accuracy >= 60 ? 'text-[#7a5a01]' : 'text-[#a73b21]'}`}>
                      {d.accuracy}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[#ffeade]">
                      <div className="h-1.5 rounded-full bg-[#924c28]" style={{ width: `${(d.done / d.chapters) * 100}%` }} />
                    </div>
                    <span className="text-xs text-[#9a7259] shrink-0">{d.done}/{d.chapters} chương</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weak chapters */}
          <div className="bg-white rounded-2xl border border-[#ffeade] shadow-sm p-6">
            <h2 className="text-base font-bold text-[#492b17] mb-4">Điểm yếu cần ôn 💪</h2>
            <div className="space-y-3">
              {WEAK.map((w, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#fff1ea] border border-[#ffeade]">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-[#492b17] leading-snug flex-1 mr-2">{w.name}</p>
                    <span className="text-xs font-bold text-[#a73b21] shrink-0">{w.accuracy}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 h-1.5 rounded-full bg-[#ffd0b5] mr-3">
                      <div className="h-1.5 rounded-full bg-[#a73b21]" style={{ width: `${w.accuracy}%` }} />
                    </div>
                    <button onClick={() => navigate('/study')}
                      className="px-3 py-1 rounded-lg bg-[#924c28] text-white text-xs font-semibold hover:bg-[#7a3e1f] transition-colors shrink-0">
                      Ôn tập ngay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bookmarks */}
        <div className="bg-white rounded-2xl border border-[#ffeade] shadow-sm p-6">
          <h2 className="text-base font-bold text-[#492b17] mb-4">Bookmarks & Ghi chú</h2>
          <div className="grid grid-cols-2 gap-4">
            {[['🔖','Bookmarks','14 câu đã đánh dấu'],['📝','Ghi chú','8 ghi chú cá nhân']].map(([icon,label,sub]) => (
              <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-[#fff1ea] border border-[#ffeade]">
                <div className="w-10 h-10 rounded-xl bg-[#ffeade] flex items-center justify-center text-xl">{icon}</div>
                <div>
                  <p className="text-sm font-semibold text-[#492b17]">{label}</p>
                  <p className="text-xs text-[#9a7259]">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
