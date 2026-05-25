import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppDataProvider } from './contexts/AppDataContext'
import { ActionsProvider } from './contexts/ActionsContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { AssetsPage } from './pages/AssetsPage'
import { SubscriptionsPage } from './pages/SubscriptionsPage'
import { VendorsPage } from './pages/VendorsPage'
import { PurchaseRequestsPage } from './pages/PurchaseRequestsPage'
import { ContractsPage } from './pages/ContractsPage'
import { MaintenancePage } from './pages/MaintenancePage'
import { TransfersPage } from './pages/TransfersPage'

/**
 * Q6: thin router shell. State lives in AuthProvider + AppDataProvider +
 * ActionsProvider; each page reads what it needs via the typed hooks.
 * Routes are wrapped in ProtectedRoute so unauthenticated users land on
 * /login and an unauthorized user (missing permission) is bounced to
 * /dashboard.
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppDataProvider>
          <ActionsProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute permission="asset_report_view">
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assets"
                  element={
                    <ProtectedRoute permission="asset_access">
                      <AssetsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subscriptions"
                  element={
                    <ProtectedRoute permission="subscription_manage">
                      <SubscriptionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vendors"
                  element={
                    <ProtectedRoute permission="vendor_manage">
                      <VendorsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/requests"
                  element={
                    <ProtectedRoute permission="purchase_request_create">
                      <PurchaseRequestsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contracts"
                  element={
                    <ProtectedRoute permission="contract_manage">
                      <ContractsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/maintenance"
                  element={
                    <ProtectedRoute permission="maintenance_manage">
                      <MaintenancePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transfers"
                  element={
                    <ProtectedRoute permission="asset_manage">
                      <TransfersPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ActionsProvider>
        </AppDataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
