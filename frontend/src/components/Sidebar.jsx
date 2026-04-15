import { Link, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/dashboard', label: 'Trang chủ',  icon: '🏠' },
  { to: '/library',   label: 'Thư viện',   icon: '📚' },
  { to: '/study',     label: 'Học tập',    icon: '✏️' },
  { to: '/study',     label: 'Ôn tập',     icon: '🔄' },
  { to: '/exam',      label: 'Kiểm tra',   icon: '📝' },
  { to: '/progress',  label: 'Tiến độ',    icon: '📊' },
]

export default function Sidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-white border-r border-[#d6a98c] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-[#ffeade]">
        <div className="w-8 h-8 rounded-lg bg-[#924c28] flex items-center justify-center text-white text-sm font-bold">S</div>
        <span className="font-bold text-[#492b17] text-lg">SmartLearn</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.to && item.label !== 'Ôn tập'
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#ffeade] text-[#924c28]'
                  : 'text-[#7b573f] hover:bg-[#fff1ea] hover:text-[#924c28]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-[#ffeade] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#fda278] flex items-center justify-center text-[#924c28] font-bold text-sm">Đ</div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-[#492b17] truncate">Đức Thành</p>
          <p className="text-xs text-[#9a7259] truncate">B21DCCN676</p>
        </div>
      </div>
    </aside>
  )
}
