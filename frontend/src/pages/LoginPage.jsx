import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, User, Users, HelpCircle, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/dashboard')
  }

  const stagger = {
    animate: { transition: { staggerChildren: 0.06 } },
  }
  const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Hero panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-tertiary">
        {/* Decorative shapes */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-1/3 -right-24 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-20 left-1/4 w-48 h-48 rounded-full bg-white/5" />

        <motion.div {...fadeUp} className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg shadow-lg">S</div>
          <span className="text-white font-bold text-xl tracking-tight">SmartLearn</span>
        </motion.div>

        <motion.div variants={stagger} initial="initial" animate="animate" className="relative z-10">
          <motion.h1 {...fadeUp} className="text-white text-5xl font-bold leading-tight mb-4">
            Học thông minh<br />hơn mỗi ngày
          </motion.h1>
          <motion.p {...fadeUp} className="text-white/70 text-lg mb-10 max-w-sm leading-relaxed">
            Tự động tạo câu hỏi từ tài liệu của bạn. Ôn tập hiệu quả với AI.
          </motion.p>
          <motion.div {...fadeUp} className="grid grid-cols-3 gap-4">
            {[
              { n: '12k+', l: 'Người dùng', icon: Users },
              { n: '500k+', l: 'Câu hỏi', icon: HelpCircle },
              { n: '95%', l: 'Hài lòng', icon: Star },
            ].map(s => (
              <div key={s.l} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10 hover:bg-white/15 transition-colors duration-200">
                <s.icon size={22} className="text-white/70 mx-auto mb-2" />
                <p className="text-white font-bold text-xl">{s.n}</p>
                <p className="text-white/60 text-xs mt-1">{s.l}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <p className="relative z-10 text-white/40 text-sm">© 2025 SmartLearn · Nhóm 07</p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-xl shadow-lg">S</div>
            <span className="font-bold text-on-surface text-2xl tracking-tight">SmartLearn</span>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full mb-8">
              <TabsTrigger value="login" className="flex-1">Đăng nhập</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Đăng ký</TabsTrigger>
            </TabsList>

            {/* ── Login tab ── */}
            <TabsContent value="login">
              <h2 className="text-2xl font-bold text-on-surface mb-1">Chào mừng trở lại 👋</h2>
              <p className="text-muted text-sm mb-6">Đăng nhập để tiếp tục học tập</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                    <Input type="email" placeholder="email@example.com" className="pl-11" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Mật khẩu</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                    <Input type={showPw ? 'text' : 'password'} placeholder="••••••••" className="pl-11 pr-12" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                    <input type="checkbox" className="accent-primary w-4 h-4 rounded" />
                    Ghi nhớ đăng nhập
                  </label>
                  <Button variant="link" size="sm" type="button">Quên mật khẩu?</Button>
                </div>
                <Button type="submit" className="w-full" size="lg">Đăng nhập</Button>
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-outline-variant" />
                  <span className="text-xs text-muted">hoặc</span>
                  <div className="flex-1 h-px bg-outline-variant" />
                </div>
                <Button type="button" variant="outline" className="w-full">
                  Đăng nhập với Google
                </Button>
              </form>
            </TabsContent>

            {/* ── Register tab ── */}
            <TabsContent value="register">
              <h2 className="text-2xl font-bold text-on-surface mb-1">Tạo tài khoản mới ✨</h2>
              <p className="text-muted text-sm mb-6">Bắt đầu hành trình học tập thông minh</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Họ và tên</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                    <Input type="text" placeholder="Nguyễn Văn A" className="pl-11" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                    <Input type="email" placeholder="email@example.com" className="pl-11" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Mật khẩu</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                    <Input type={showPw ? 'text' : 'password'} placeholder="••••••••" className="pl-11 pr-12" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm text-on-surface-variant cursor-pointer">
                  <input type="checkbox" className="mt-0.5 accent-primary w-4 h-4 rounded" />
                  <span>Tôi đồng ý với <button type="button" className="text-primary font-medium hover:underline underline-offset-2">Điều khoản sử dụng</button></span>
                </label>
                <Button type="submit" className="w-full" size="lg">Đăng ký</Button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-outline-variant" />
                  <span className="text-xs text-muted">hoặc</span>
                  <div className="flex-1 h-px bg-outline-variant" />
                </div>
                <Button type="button" variant="outline" className="w-full">
                  Đăng ký với Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}
