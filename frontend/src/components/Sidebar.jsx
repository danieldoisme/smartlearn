import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home, Library, BookOpen, RotateCcw, ClipboardCheck, BarChart3, Settings, Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const NAV = [
  { to: '/dashboard', label: 'Trang chủ',  icon: Home },
  { to: '/library',   label: 'Thư viện',   icon: Library },
  { to: '/study',     label: 'Học tập',     icon: BookOpen },
  { to: '/review',    label: 'Ôn tập',      icon: RotateCcw },
  { to: '/exam',      label: 'Kiểm tra',    icon: ClipboardCheck },
  { to: '/progress',  label: 'Tiến độ',     icon: BarChart3 },
]

export default function Sidebar() {
  const { pathname } = useLocation()

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="hidden lg:flex flex-col w-60 min-h-screen border-r border-outline-variant shrink-0 bg-gradient-to-b from-white to-surface"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-outline-variant">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-base shadow-md ring-2 ring-primary-container/40">
          S
        </div>
        <div>
          <span className="font-bold text-on-surface text-lg tracking-tight block leading-tight">SmartLearn</span>
          <span className="text-[10px] text-muted font-medium tracking-wide">Học thông minh hơn</span>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pt-5 pb-2">
        <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">Điều hướng</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.to
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative",
                active
                  ? "bg-primary text-on-primary font-semibold shadow-md shadow-primary/20"
                  : "text-on-surface-variant font-medium hover:bg-surface-dim hover:text-primary"
              )}
            >
              <span className={cn(
                "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200",
                active ? "bg-white/20" : "bg-surface-container group-hover:bg-primary-container/40"
              )}>
                <Icon size={16} />
              </span>
              {item.label}
              {active && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full bg-white/60"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Streak card */}
      <div className="px-3 py-3">
        <div className="rounded-xl p-3.5 bg-gradient-to-br from-primary-container/50 to-tertiary-container/40 border border-primary-container/30">
          <div className="flex items-center gap-2 mb-1.5">
            <Flame size={16} className="text-primary" />
            <span className="text-xs font-semibold text-primary">Chuỗi 7 ngày!</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">Tiếp tục duy trì thói quen học tập tuyệt vời nhé!</p>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-outline-variant flex items-center gap-3">
        <Avatar className="ring-2 ring-white shadow-md">
          <AvatarFallback>Đ</AvatarFallback>
        </Avatar>
        <div className="overflow-hidden flex-1">
          <p className="text-sm font-semibold text-on-surface truncate">Đức Thành</p>
          <p className="text-[11px] text-muted truncate">B21DCCN676</p>
        </div>
        <button className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-high flex items-center justify-center text-muted transition-all duration-150" aria-label="Cài đặt">
          <Settings size={14} />
        </button>
      </div>
    </motion.aside>
  )
}
