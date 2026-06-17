/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'

// Lets an active exam ask the surrounding AppLayout to drop the sidebar and go
// full-width ("focus mode"), without ExamPage knowing about layout internals.
const ExamFocusContext = createContext({
  focusMode: false,
  setFocusMode: () => {},
})

export function ExamFocusProvider({ children }) {
  const [focusMode, setFocusMode] = useState(false)
  return (
    <ExamFocusContext.Provider value={{ focusMode, setFocusMode }}>
      {children}
    </ExamFocusContext.Provider>
  )
}

export function useExamFocus() {
  return useContext(ExamFocusContext)
}
