import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Questionnaire from './pages/Questionnaire'
import Results from './pages/Results'
import Dashboard from './pages/Dashboard'
import LabReports from './pages/LabReports'
import CGMIntegration from './pages/CGMIntegration'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/"              element={<Landing />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/results"       element={<Results />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/lab-reports"   element={<LabReports />} />
          <Route path="/cgm"           element={<CGMIntegration />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
