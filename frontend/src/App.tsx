import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { api } from './api/client'
import { useAppStore } from './store/useAppStore'
import { initAnalytics } from './lib/analytics'
import Footer from './components/Footer'
import RequireAuth from './components/RequireAuth'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import SkillTreePage from './pages/SkillTreePage'
import UnitLessonsPage from './pages/UnitLessonsPage'
import LessonPlayerPage from './pages/LessonPlayerPage'
import LessonResultPage from './pages/LessonResultPage'
import LegalPage from './pages/LegalPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  const setUser = useAppStore((s) => s.setUser)
  const setSessionChecked = useAppStore((s) => s.setSessionChecked)

  useEffect(() => {
    initAnalytics()
    api
      .session()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setSessionChecked(true))
  }, [setUser, setSessionChecked])

  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-white text-slate-900">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <SkillTreePage />
              </RequireAuth>
            }
          />
          <Route
            path="/units/:unitId"
            element={
              <RequireAuth>
                <UnitLessonsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/lessons/:lessonId"
            element={
              <RequireAuth>
                <LessonPlayerPage />
              </RequireAuth>
            }
          />
          <Route
            path="/lessons/:lessonId/result"
            element={
              <RequireAuth>
                <LessonResultPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
