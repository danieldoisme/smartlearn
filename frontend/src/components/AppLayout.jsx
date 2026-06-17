import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { ExamFocusProvider, useExamFocus } from './ExamFocusContext'

function AppLayoutInner() {
  const { focusMode } = useExamFocus()
  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-mesh" />
      {!focusMode && <Sidebar />}
      <main className={`min-h-screen p-8 ${focusMode ? '' : 'ml-64'}`}>
        <Outlet />
      </main>
    </div>
  )
}

export default function AppLayout() {
  return (
    <ExamFocusProvider>
      <AppLayoutInner />
    </ExamFocusProvider>
  )
}
