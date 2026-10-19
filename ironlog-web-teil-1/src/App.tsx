import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DataProvider, SessionProvider, useData } from '@/state/store'
import { AppShell } from '@/components/AppShell'
import { RestTimer } from '@/components/RestTimer'
import Landing from '@/pages/Landing'
import Auth from '@/pages/Auth'
import Dashboard from '@/pages/Dashboard'
import Training from '@/pages/Training'
import Recap from '@/pages/Recap'
import Library from '@/pages/Library'
import ExerciseDetail from '@/pages/ExerciseDetail'
import History from '@/pages/History'
import Progress from '@/pages/Progress'
import Templates from '@/pages/Templates'
import Nutrition from '@/pages/Nutrition'
import Settings from '@/pages/Settings'
import Buddies from '@/pages/Buddies'
import { SocialProvider } from '@/state/social'
import { AvatarOnboarding } from '@/components/Avatar'
import { Datenschutz, Impressum } from '@/pages/Legal'
import { NewPasswordDialog } from '@/components/NewPasswordDialog'

function Routed() {
  const { ready, user } = useData()
  const loc = useLocation()

  useEffect(() => {
    if (ready) document.getElementById('splash')?.classList.add('hide')
  }, [ready])
  useEffect(() => {
    // Block-Body: der Rückgabewert von scrollTo darf nie als Cleanup-Funktion landen
    try {
      window.scrollTo(0, 0)
    } catch {
      /* noop */
    }
  }, [loc.pathname])

  if (!ready) return null

  if (!user)
    return (
      <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )

  return (
    <SessionProvider>
      <SocialProvider>
      <AppShell>
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/training" element={<Training />} />
            <Route path="/recap/:id" element={<Recap />} />
            <Route path="/uebungen" element={<Library />} />
            <Route path="/uebungen/:id" element={<ExerciseDetail />} />
            <Route path="/verlauf" element={<History />} />
            <Route path="/fortschritt" element={<Progress />} />
            <Route path="/plaene" element={<Templates />} />
            <Route path="/ernaehrung" element={<Nutrition />} />
            <Route path="/einstellungen" element={<Settings />} />
            <Route path="/buddys" element={<Buddies />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <RestTimer />
      <AvatarOnboarding />
      </SocialProvider>
    </SessionProvider>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <DataProvider>
          <Routed />
          <NewPasswordDialog />
        </DataProvider>
      </ErrorBoundary>
    </MotionConfig>
  )
}
