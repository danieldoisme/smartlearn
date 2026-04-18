import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConfirmPasswordReset } from '@/api/auth'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)

  const confirmMutation = useConfirmPasswordReset()
  const serverError = confirmMutation.error?.response?.data?.detail

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError('')
    if (!token) {
      setFormError('Liên kết không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.')
      return
    }
    if (!password || !confirmPassword) {
      setFormError('Vui lòng nhập mật khẩu mới và xác nhận mật khẩu.')
      return
    }
    if (password.length < 6) {
      setFormError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }
    if (password !== confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp.')
      return
    }
    confirmMutation.mutate(
      { token, newPassword: password },
      {
        onSuccess: () => {
          setSuccess(true)
          setTimeout(() => navigate('/login', { replace: true }), 2500)
        },
      }
    )
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
          <h1 className="text-2xl font-bold text-slate-900">Đặt lại mật khẩu</h1>
          <p className="text-slate-500 text-sm mt-1">
            Nhập mật khẩu mới cho tài khoản SmartLearn của bạn
          </p>
        </div>

        <div className="glass-card p-8">
          {!token && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
              Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="text-sm text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-3 py-3">
                Đặt lại mật khẩu thành công. Đang chuyển về trang đăng nhập...
              </div>
              <Link
                to="/login"
                className="block text-center text-xs text-primary-600 hover:text-primary-700"
              >
                Quay lại đăng nhập ngay
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="username"
                autoComplete="username"
                value=""
                readOnly
                hidden
                aria-hidden="true"
              />
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Mật khẩu mới
                </label>
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
                    autoComplete="new-password"
                    required
                    disabled={!token}
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

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  Xác nhận mật khẩu
                </label>
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
                    required
                    disabled={!token}
                  />
                </div>
              </div>

              {(formError || serverError) && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {formError || serverError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={confirmMutation.isPending || !token}
              >
                {confirmMutation.isPending ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-xs text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Quay lại đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Nền tảng học tập AI cho sinh viên Việt Nam
        </p>
      </motion.div>
    </div>
  )
}
