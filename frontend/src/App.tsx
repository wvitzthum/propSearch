import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PropertiesPage from './pages/PropertiesPage';
import MapView from './pages/MapView';
import PropertyDetail from './pages/PropertyDetail';
import PropertyEdit from './pages/PropertyEdit';
import RatesPage from './pages/RatesPage';
import MarketPage from './pages/MarketPage';
import ArchiveReview from './pages/ArchiveReview';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import ComparisonPage from './pages/ComparisonPage';
import AffordabilityCalculator from './pages/AffordabilityCalculator';
import Inbox from './pages/Inbox';
import { PropertyProvider } from './hooks/PropertyContext';

function App() {
  return (
    <PropertyProvider>
      <Router>
        <Layout>
          <Routes>
            {/* Redirects: consolidate old routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/mortgage" element={<Navigate to="/affordability" replace />} />
            <Route path="/compare" element={<Navigate to="/comparison" replace />} />

            {/* Active 5-page structure (FE-175) */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/rates" element={<RatesPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/affordability" element={<AffordabilityCalculator />} />
            <Route path="/archive" element={<ArchiveReview />} />

            {/* Deep-dive routes */}
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/property/:id/edit" element={<PropertyEdit />} />

            {/* 404 */}
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                <div className="h-20 w-20 bg-linear-card border border-linear-border rounded-2xl flex items-center justify-center text-linear-accent mb-6 shadow-2xl">
                  <ShieldAlert size={40} />
                </div>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tighter">404</h1>
                <p className="text-linear-text-muted mb-8 max-w-xs text-sm">The institutional endpoint you are attempting to reach does not exist or has been restricted.</p>
                <Link to="/dashboard" className="px-6 py-2.5 bg-white text-black rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5">
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
