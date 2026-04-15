import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [tab, setTab] = useState('login')
  const [showPw, setShowPw] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left hero */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #924c28 0%, #C1714A 50%, #fda278 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">S</div>
          <span className="text-white font-bold text-xl">SmartLearn</span>
        </div>
        <div>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Học thông minh hơn<br />mỗi ngày ✨
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Tự động tạo câu hỏi từ tài liệu của bạn.<br />
            Ôn tập hiệu quả với AI.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[['12k+','Người dùng'],['500k+','Câu hỏi'],['95%','Hài lòng']].map(([n,l]) => (
              <div key={l} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-white font-bold text-2xl">{n}</p>
                <p className="text-white/70 text-sm">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/50 text-sm">© 2025 SmartLearn · Nhóm 07</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#fff8f5]">
        <div className="w-full max-w-md">
          {/* Tab toggle */}
          <div className="flex bg-[#ffeade] rounded-xl p-1 mb-8">
            {[['login','Đăng nhập'],['register','Đăng ký']].map(([key,label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === key ? 'bg-white text-[#924c28] shadow-sm' : 'text-[#7b573f]'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <>
              <h2 className="text-2xl font-bold text-[#492b17] mb-1">Chào mừng trở lại 👋</h2>
              <p className="text-[#9a7259] mb-6">Đăng nhập để tiếp tục học tập</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#492b17] mb-1.5">Email</label>
                  <input type="email" placeholder="email@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-[#d6a98c] bg-white text-[#492b17] text-sm focus:outline-none focus:ring-2 focus:ring-[#924c28]/30 focus:border-[#924c28] placeholder-[#d6a98c]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#492b17] mb-1.5">Mật khẩu</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl border border-[#d6a98c] bg-white text-[#492b17] text-sm focus:outline-none focus:ring-2 focus:ring-[#924c28]/30 focus:border-[#924c28] placeholder-[#d6a98c]" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a7259] text-lg">
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-[#7b573f] cursor-pointer">
                    <input type="checkbox" className="accent-[#924c28]" />
                    Ghi nhớ đăng nhập
                  </label>
                  <button type="button" className="text-sm font-medium text-[#924c28] hover:underline">
                    Quên mật khẩu?
                  </button>
                </div>
                <button type="submit"
                  className="w-full py-3 rounded-xl bg-[#924c28] text-white font-semibold text-sm hover:bg-[#7a3e1f] transition-colors">
                  Đăng nhập
                </button>
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-[#d6a98c]" />
                  <span className="text-xs text-[#9a7259]">hoặc</span>
                  <div className="flex-1 h-px bg-[#d6a98c]" />
                </div>
                <button type="button"
                  className="w-full py-3 rounded-xl border border-[#d6a98c] bg-white text-[#492b17] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#fff1ea] transition-colors">
                  <span>🔵</span> Đăng nhập với Google
                </button>
              </form>
              <p className="text-center text-sm text-[#9a7259] mt-6">
                Chưa có tài khoản?{' '}
                <button onClick={() => setTab('register')} className="text-[#924c28] font-semibold hover:underline">
                  Đăng ký ngay
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#492b17] mb-1">Tạo tài khoản mới ✨</h2>
              <p className="text-[#9a7259] mb-6">Bắt đầu hành trình học tập thông minh</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#492b17] mb-1.5">Họ và tên</label>
                  <input type="text" placeholder="Nguyễn Văn A"
                    className="w-full px-4 py-3 rounded-xl border border-[#d6a98c] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#924c28]/30 focus:border-[#924c28] placeholder-[#d6a98c]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#492b17] mb-1.5">Email</label>
                  <input type="email" placeholder="email@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-[#d6a98c] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#924c28]/30 focus:border-[#924c28] placeholder-[#d6a98c]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#492b17] mb-1.5">Mật khẩu</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl border border-[#d6a98c] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#924c28]/30 focus:border-[#924c28] placeholder-[#d6a98c]" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a7259] text-lg">
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm text-[#7b573f] cursor-pointer">
                  <input type="checkbox" className="mt-0.5 accent-[#924c28]" />
                  Tôi đồng ý với{' '}
                  <span className="text-[#924c28] hover:underline cursor-pointer">Điều khoản và Chính sách bảo mật</span>
                </label>
                <button type="submit"
                  className="w-full py-3 rounded-xl bg-[#924c28] text-white font-semibold text-sm hover:bg-[#7a3e1f] transition-colors">
                  Đăng ký
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#d6a98c]" />
                  <span className="text-xs text-[#9a7259]">hoặc</span>
                  <div className="flex-1 h-px bg-[#d6a98c]" />
                </div>
                <button type="button"
                  className="w-full py-3 rounded-xl border border-[#d6a98c] bg-white text-[#492b17] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#fff1ea] transition-colors">
                  <span>🔵</span> Đăng ký với Google
                </button>
              </form>
              <p className="text-center text-sm text-[#9a7259] mt-6">
                Đã có tài khoản?{' '}
                <button onClick={() => setTab('login')} className="text-[#924c28] font-semibold hover:underline">
                  Đăng nhập
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
