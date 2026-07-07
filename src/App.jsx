import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Questionnaire from './pages/Questionnaire'
import Results from './pages/Results'
import Dashboard from './pages/Dashboard'
import LabReports from './pages/LabReports'
import CGMIntegration from './pages/CGMIntegration'

const GOOGLE_CLIENT_ID = '651963586598-rhorm8cvtlueccnuuck7odrko8crkha9.apps.googleusercontent.com'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      {user && <Navbar />}
      <main className={user ? 'main-content' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"            element={<ProtectedRoute><Landing /></ProtectedRoute>} />
          <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />
          <Route path="/results"     element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/lab-reports" element={<ProtectedRoute><LabReports /></ProtectedRoute>} />
          <Route path="/cgm"         element={<ProtectedRoute><CGMIntegration /></ProtectedRoute>} />
        </Routes>
      </main>
    </>
  )
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
