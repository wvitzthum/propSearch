import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import PropertyDetail from './pages/PropertyDetail';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import ComparisonPage from './pages/ComparisonPage';
import MortgageTracker from './pages/MortgageTracker';
import Inbox from './pages/Inbox';
import { PropertyProvider } from './hooks/PropertyContext';

function App() {
  return (
    <PropertyProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/compare" element={<ComparisonPage />} />
            <Route path="/mortgage" element={<MortgageTracker />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                <div className="h-20 w-20 bg-linear-card border border-linear-border rounded-2xl flex items-center justify-center text-linear-accent mb-6 shadow-2xl">
                  <ShieldAlert size={40} />
                </div>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tighter">404</h1>
                <p className="text-linear-text-muted mb-8 max-w-xs text-sm">The institutional endpoint you are attempting to reach does not exist or has been restricted.</p>
                <Link to="/" className="px-6 py-2.5 bg-white text-black rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5">
                  <ArrowLeft size={16} />
                  Return to Base
                </Link>
              </div>
            } />
          </Routes>
        </Layout>
      </Router>
    </PropertyProvider>
  );
}

export default App;
