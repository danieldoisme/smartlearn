import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LibraryPage from './pages/LibraryPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import UploadPage from './pages/UploadPage'
import StudyPage from './pages/StudyPage'
import ExamPage from './pages/ExamPage'
import ResultPage from './pages/ResultPage'
import ProgressPage from './pages/ProgressPage'
import SettingsPage from './pages/SettingsPage'
import BookmarksPage from './pages/BookmarksPage'
import ReviewPage from './pages/ReviewPage'

export default function App() {
  return (
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
  )
}
