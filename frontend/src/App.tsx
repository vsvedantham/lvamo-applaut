import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import ResumePage from './pages/Resume'
import Opportunities from './pages/Opportunities'
import OpportunityDetail from './pages/OpportunityDetail'
import Scores from './pages/Scores'
import DocumentDetail from './pages/DocumentDetail'
import Applications from './pages/Applications'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route
              path="onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="resume"
              element={
                <ProtectedRoute>
                  <ResumePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="opportunities"
              element={
                <ProtectedRoute>
                  <Opportunities />
                </ProtectedRoute>
              }
            />
            <Route
              path="opportunities/:id"
              element={
                <ProtectedRoute>
                  <OpportunityDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="scores"
              element={
                <ProtectedRoute>
                  <Scores />
                </ProtectedRoute>
              }
            />
            <Route
              path="documents/:opportunityId"
              element={
                <ProtectedRoute>
                  <DocumentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="applications"
              element={
                <ProtectedRoute>
                  <Applications />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
