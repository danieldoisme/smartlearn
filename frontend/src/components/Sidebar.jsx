import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Library,
  Upload,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Bookmark,
  RotateCcw,
  Settings,
  LogOut,
  GraduationCap,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Trang chủ' },
  { to: '/library', icon: Library, label: 'Thư viện' },
  { to: '/upload', icon: Upload, label: 'Tải lên' },
  { to: '/study', icon: BookOpen, label: 'Học tập' },
  { to: '/exam', icon: ClipboardCheck, label: 'Kiểm tra' },
  { to: '/review', icon: RotateCcw, label: 'Ôn tập câu sai' },
  { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
  { to: '/progress', icon: BarChart3, label: 'Tiến độ' },
  { to: '/settings', icon: Settings, label: 'Cài đặt' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200/60 bg-white/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200/60">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-md shadow-primary-500/20">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">SmartLearn</h1>
          <p className="text-[10px] text-slate-400 font-medium">Học thông minh hơn</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200/60 px-3 py-4">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">TH</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">Đức Thành</p>
            <p className="text-xs text-slate-400 truncate">sinh viên</p>
          </div>
          <button className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
