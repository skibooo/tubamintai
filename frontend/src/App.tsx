import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Signup from './components/Signup'
import ChannelDetail from './components/ChannelDetail'
import Billing from './components/Billing'
import PaymentSuccess from './components/PaymentSuccess'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route
          path="/dashboard"
          element={
            <AppShell>
              <Dashboard />
            </AppShell>
          }
        />
        <Route
          path="/channels/:id"
          element={
            <AppShell>
              <ChannelDetail />
            </AppShell>
          }
        />
        <Route
  path="/billing"
  element={
    <AppShell>
      <Billing />
    </AppShell>
  }
/>
      </Routes>
    </BrowserRouter>
  )
}

export default App