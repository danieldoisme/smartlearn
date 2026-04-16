import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const DocumentDetailPage = lazy(() => import('./pages/DocumentDetailPage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const StudyPage = lazy(() => import('./pages/StudyPage'))
const ExamPage = lazy(() => import('./pages/ExamPage'))
const ResultPage = lazy(() => import('./pages/ResultPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const ReviewPage = lazy(() => import('./pages/ReviewPage'))

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/document/:id" element={<DocumentDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/study" element={<StudyPage />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/review" element={<ReviewPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
