import { BrowserRouter as Router, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { SiteProvider } from './context/SiteContext';

import Home from './pages/Home';

// Placeholder Pages
import Schedule from './pages/Schedule';
import Portfolio from './pages/Portfolio';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Products from './pages/Products';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Placeholder Pages - Removed as all are implemented

// Layout with Navigation will be added here
import Navbar from './components/Navbar';
import Header from './components/Header';

function App() {
  return (
    <SiteProvider>
      <Router>
        <div className="app-root">
          <AppRoutes />
        </div>
      </Router>
    </SiteProvider>
  );
}

function PublicLayout() {
  return (
    <>
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Navbar />
    </>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes with Navbar */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/agendamento" element={<Schedule />} />
          <Route path="/portifolio" element={<Portfolio />} />
          <Route path="/contato" element={<Contact />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Admin Routes without Navbar */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route index element={<Admin />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default App;
