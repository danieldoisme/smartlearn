import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Lock,
  Settings2,
  Camera,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { mockUser, mockUserPreference } from '@/mocks'
import { QuestionType, DisplayMode, QuestionTypeLabel, DisplayModeLabel } from '@/models'

const questionTypes = [
  { value: QuestionType.MCQ, label: QuestionTypeLabel[QuestionType.MCQ] },
  { value: QuestionType.MULTI, label: QuestionTypeLabel[QuestionType.MULTI] },
  { value: QuestionType.FILL, label: QuestionTypeLabel[QuestionType.FILL] },
]

const displayModes = [
  { value: DisplayMode.IMMEDIATE, label: DisplayModeLabel[DisplayMode.IMMEDIATE], desc: 'Xem đáp án ngay sau mỗi câu' },
  { value: DisplayMode.END, label: DisplayModeLabel[DisplayMode.END], desc: 'Xem tất cả đáp án sau khi hoàn thành' },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    fullName: mockUser.fullName,
    email: mockUser.email,
  })
  const [showOldPw, setShowOldPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [preferences, setPreferences] = useState({
    defaultQuestionCount: mockUserPreference.defaultQuestionCount,
    preferredQuestionType: mockUserPreference.preferredQuestionType,
    answerDisplayMode: mockUserPreference.answerDisplayMode,
  })
  const [saved, setSaved] = useState(null)

  const handleSave = (section) => {
    setSaved(section)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-3xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-slate-900">Thông tin cá nhân</h1>
        <p className="text-slate-500 text-sm mt-1">Quản lý tài khoản và tùy chọn học tập</p>
      </motion.div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4" />
            Hồ sơ
          </TabsTrigger>
          <TabsTrigger value="password">
            <Lock className="h-4 w-4" />
            Đổi mật khẩu
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Settings2 className="h-4 w-4" />
            Cài đặt học tập
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <motion.div variants={item}>
            <Card className="p-6">
              <CardContent className="space-y-6">
                <div className="flex items-center gap-5">
                  <div className="relative group">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="text-2xl">TH</AvatarFallback>
                    </Avatar>
                    <button className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="h-5 w-5 text-white" />
                    </button>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{profile.fullName}</p>
                    <p className="text-sm text-slate-500">{profile.email}</p>
                    {mockUser.emailVerified && <Badge variant="success" className="mt-1">Email đã xác nhận</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fullName" className="block text-xs font-medium text-slate-600 mb-1.5">Họ và tên</label>
                    <Input
                      id="fullName"
                      name="fullName"
                      autoComplete="name"
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={() => handleSave('profile')}>
                    <Save className="h-4 w-4" />
                    Lưu thay đổi
                  </Button>
                  {saved === 'profile' && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 text-sm text-emerald-600"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Cập nhật thành công
                    </motion.span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="password">
          <motion.div variants={item}>
            <Card className="p-6">
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleSave('password') }} className="space-y-4">
                  <input type="text" name="username" autoComplete="username" value={profile.email} readOnly hidden aria-hidden="true" />
                  <div>
                    <label htmlFor="currentPassword" className="block text-xs font-medium text-slate-600 mb-1.5">Mật khẩu hiện tại</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showOldPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPw(!showOldPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showOldPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-xs font-medium text-slate-600 mb-1.5">Mật khẩu mới</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-600 mb-1.5">Xác nhận mật khẩu mới</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" className="pl-10" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button type="submit">
                      <Save className="h-4 w-4" />
                      Cập nhật mật khẩu
                    </Button>
                    {saved === 'password' && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1.5 text-sm text-emerald-600"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Đổi mật khẩu thành công
                      </motion.span>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="preferences">
          <motion.div variants={item}>
            <Card className="p-6">
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Số câu hỏi mặc định mỗi phiên</label>
                  <p className="text-xs text-slate-500 mb-3">Áp dụng khi bắt đầu phiên học tập mới</p>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20, 30].map((n) => (
                      <button
                        key={n}
                        onClick={() => setPreferences({ ...preferences, defaultQuestionCount: n })}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all cursor-pointer ${preferences.defaultQuestionCount === n
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'text-slate-500 border border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Loại câu hỏi ưu tiên</label>
                  <p className="text-xs text-slate-500 mb-3">Loại câu hỏi được ưu tiên khi tạo tự động</p>
                  <div className="flex gap-2">
                    {questionTypes.map((qt) => (
                      <button
                        key={qt.value}
                        onClick={() => setPreferences({ ...preferences, preferredQuestionType: qt.value })}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all cursor-pointer ${preferences.preferredQuestionType === qt.value
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'text-slate-500 border border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        {qt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Chế độ hiển thị đáp án</label>
                  <p className="text-xs text-slate-500 mb-3">Cách hiển thị kết quả trong phiên học tập</p>
                  <div className="space-y-2">
                    {displayModes.map((dm) => (
                      <button
                        key={dm.value}
                        onClick={() => setPreferences({ ...preferences, answerDisplayMode: dm.value })}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm transition-all cursor-pointer ${preferences.answerDisplayMode === dm.value
                          ? 'bg-primary-50 border border-primary-200 text-primary-800'
                          : 'bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100 hover:border-slate-200'
                          }`}
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${preferences.answerDisplayMode === dm.value
                          ? 'border-primary-500'
                          : 'border-slate-300'
                          }`}>
                          {preferences.answerDisplayMode === dm.value && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{dm.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{dm.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={() => handleSave('preferences')}>
                    <Save className="h-4 w-4" />
                    Lưu cài đặt
                  </Button>
                  {saved === 'preferences' && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 text-sm text-emerald-600"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Cập nhật thành công
                    </motion.span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
