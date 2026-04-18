import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLogin, useRegister, useRequestPasswordReset } from '@/api/auth'
import { useAuth } from '@/auth/AuthContext'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [isResetMode, setIsResetMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [formError, setFormError] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const requestResetMutation = useRequestPasswordReset()

  const redirectTo = location.state?.from?.pathname || '/'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, navigate, redirectTo])

  const isPending =
    loginMutation.isPending || registerMutation.isPending || requestResetMutation.isPending
  const serverError =
    loginMutation.error?.response?.data?.detail ||
    registerMutation.error?.response?.data?.detail ||
    requestResetMutation.error?.response?.data?.detail

  const resetFormState = () => {
    setFormError('')
    setResetMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError('')
    setResetMessage('')

    if (isResetMode) {
      if (!email) {
        setFormError('Vui lòng nhập email đã đăng ký.')
        return
      }
      requestResetMutation.mutate(
        { email },
        {
          onSuccess: (data) => {
            setResetMessage(
              data?.message ||
                'Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.'
            )
          },
        }
      )
      return
    }

    if (!email || !password) {
      setFormError('Vui lòng nhập email và mật khẩu.')
      return
    }

    if (isLogin) {
      loginMutation.mutate(
        { email, password },
        {
          onSuccess: () => navigate(redirectTo, { replace: true }),
        }
      )
    } else {
      if (password !== confirmPassword) {
        setFormError('Mật khẩu xác nhận không khớp.')
        return
      }
      registerMutation.mutate(
        { email, password, fullName: fullName || null },
        {
          onSuccess: () => navigate(redirectTo, { replace: true }),
        }
      )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="bg-mesh" />

      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary-200/30 blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-primary-300/20 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/20 mb-4">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SmartLearn</h1>
          <p className="text-slate-500 text-sm mt-1">Hệ thống hỗ trợ học tập thông minh</p>
        </div>

        <div className="glass-card p-8">
          {!isResetMode && (
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true)
                  resetFormState()
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                  isLogin ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-600'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false)
                  resetFormState()
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                  !isLogin ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-600'
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}

          {isResetMode && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Quên mật khẩu</h2>
              <p className="text-xs text-slate-500 mt-1">
                Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu tới hộp thư của bạn.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isResetMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label htmlFor="fullName" className="block text-xs font-medium text-slate-600 mb-1.5">Họ và tên</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    className="pl-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {!isResetMode && (
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-600 mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {!isLogin && !isResetMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-600 mb-1.5">Xác nhận mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </motion.div>
            )}

            {(formError || serverError) && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {formError || serverError}
              </div>
            )}

            {resetMessage && (
              <div className="text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
                {resetMessage}
              </div>
            )}

            {isLogin && !isResetMode && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true)
                    resetFormState()
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isPending}>
              {isPending
                ? 'Đang xử lý...'
                : isResetMode
                  ? 'Gửi liên kết đặt lại'
                  : isLogin
                    ? 'Đăng nhập'
                    : 'Tạo tài khoản'}
              <ArrowRight className="h-4 w-4" />
            </Button>

            {isResetMode && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false)
                    resetFormState()
                    requestResetMutation.reset()
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Nền tảng học tập AI cho sinh viên Việt Nam
        </p>
      </motion.div>
    </div>
  )
}
