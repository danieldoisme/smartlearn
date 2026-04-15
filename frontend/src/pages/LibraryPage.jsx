import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

const TOPICS = ['Tất cả', 'Cơ sở dữ liệu', 'Lập trình Python', 'Toán rời rạc', 'Mạng máy tính']

const DOCS = [
  { title: 'Giáo trình Cơ sở dữ liệu', type: 'PDF', topic: 'Cơ sở dữ liệu', chapters: 8, questions: 120, progress: 65, date: '10/04/2025' },
  { title: 'Lập trình Python nâng cao', type: 'DOCX', topic: 'Lập trình Python', chapters: 12, questions: 180, progress: 40, date: '08/04/2025' },
  { title: 'Toán rời rạc ứng dụng', type: 'PDF', topic: 'Toán rời rạc', chapters: 6, questions: 90, progress: 80, date: '05/04/2025' },
  { title: 'Bài giảng Mạng máy tính', type: 'PDF', topic: 'Mạng máy tính', chapters: 10, questions: 150, progress: 20, date: '01/04/2025' },
  { title: 'Đề cương ôn tập CSDL', type: 'DOCX', topic: 'Cơ sở dữ liệu', chapters: 4, questions: 60, progress: 100, date: '28/03/2025' },
  { title: 'Python cho người mới bắt đầu', type: 'PDF', topic: 'Lập trình Python', chapters: 15, questions: 220, progress: 10, date: '25/03/2025' },
]

export default function LibraryPage() {
  const [activeTopic, setActiveTopic] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = DOCS.filter(d =>
    (activeTopic === 'Tất cả' || d.topic === activeTopic) &&
    d.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#492b17]">Thư viện của tôi</h1>
            <p className="text-sm text-[#9a7259] mt-1">{DOCS.length} tài liệu</p>
          </div>
          <button onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#924c28] text-white font-semibold text-sm hover:bg-[#7a3e1f] transition-colors">
            <span>+</span> Tải lên tài liệu
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a7259]">🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm tài liệu..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#d6a98c] bg-white text-sm text-[#492b17] focus:outline-none focus:ring-2 focus:ring-[#924c28]/30 focus:border-[#924c28] placeholder-[#d6a98c]"
          />
        </div>

        <div className="flex gap-6">
          {/* Topic filter */}
          <aside className="w-44 shrink-0">
            <p className="text-xs font-semibold text-[#9a7259] uppercase tracking-wide mb-3">Chủ đề</p>
            <div className="space-y-1">
              {TOPICS.map(t => (
                <button key={t} onClick={() => setActiveTopic(t)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTopic === t
                      ? 'bg-[#ffeade] text-[#924c28]'
                      : 'text-[#7b573f] hover:bg-[#fff1ea]'
                  }`}>
                  {t}
                </button>
              ))}
              <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#924c28] font-medium hover:bg-[#fff1ea]">
                + Thêm chủ đề
              </button>
            </div>
          </aside>

          {/* Doc grid */}
          <div className="flex-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-5xl mb-4">📭</span>
                <p className="text-[#7b573f] font-medium">Không tìm thấy tài liệu</p>
                <p className="text-[#9a7259] text-sm mt-1">Thử thay đổi bộ lọc hoặc tải lên tài liệu mới</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((doc) => (
                  <DocCard key={doc.title} doc={doc} onStudy={() => navigate('/study')} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function DocCard({ doc, onStudy }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#ffeade] shadow-sm relative">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
          doc.type === 'PDF' ? 'bg-[#ffd0b5] text-[#924c28]' : 'bg-[#d9fcb2] text-[#4a672e]'
        }`}>{doc.type}</span>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-[#9a7259] hover:text-[#492b17] text-lg leading-none">⋯</button>
        {menuOpen && (
          <div className="absolute right-4 top-12 z-10 bg-white border border-[#ffeade] rounded-xl shadow-lg p-1 min-w-28">
            {['Học ngay', 'Ôn tập', 'Xoá'].map(a => (
              <button key={a} onClick={() => { setMenuOpen(false); if (a !== 'Xoá') onStudy() }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[#fff1ea] ${a === 'Xoá' ? 'text-[#a73b21]' : 'text-[#492b17]'}`}>
                {a}
              </button>
            ))}
          </div>
        )}
      </div>
      <h3 className="font-semibold text-[#492b17] text-sm mb-1 leading-snug">{doc.title}</h3>
      <p className="text-xs text-[#9a7259] mb-3">{doc.chapters} chương · {doc.questions} câu · {doc.date}</p>
      <div className="mb-4">
        <div className="flex justify-between text-xs text-[#9a7259] mb-1">
          <span>Tiến độ học</span>
          <span className={doc.progress === 100 ? 'text-[#4a672e] font-semibold' : ''}>{doc.progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#ffeade]">
          <div className="h-1.5 rounded-full transition-all"
            style={{ width: `${doc.progress}%`, backgroundColor: doc.progress === 100 ? '#4a672e' : '#924c28' }} />
        </div>
      </div>
      <button onClick={onStudy}
        className="w-full py-2 rounded-xl bg-[#924c28] text-white text-xs font-semibold hover:bg-[#7a3e1f] transition-colors">
        {doc.progress === 100 ? 'Ôn tập' : 'Học ngay'}
      </button>
    </div>
  )
}
