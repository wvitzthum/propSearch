import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  ExternalLink, 
  CheckCircle2, 
  ShieldAlert, 
  Calendar, 
  Maximize2, 
  Home,
  Zap,
  Gem,
  TrendingDown
} from 'lucide-react';
import { useProperties } from '../hooks/useProperties';

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { properties, loading } = useProperties();

  const property = useMemo(() => {
    return properties.find(p => p.id === id);
  }, [properties, id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-12 w-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!property) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="h-20 w-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert size={40} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Property Not Found</h1>
      <p className="text-slate-500 mb-8 max-w-md">The asset you are looking for does not exist in our institutional database or has been removed.</p>
      <Link to="/dashboard" className="px-8 py-3 bg-blue-900 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-blue-800 transition-colors">
        <ArrowLeft size={18} />
        Back to Dashboard
      </Link>
    </div>
  );

  return (
    <div className="px-6 py-12 max-w-5xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-900 transition-colors mb-8 group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Results
      </Link>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-full border border-blue-100">
              {property.area}
            </span>
            {property.is_value_buy && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-full border border-emerald-100 flex items-center gap-1">
                <Gem size={12} />
                Value Buy
              </span>
            )}
            <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase rounded-full border border-slate-200">
              ID: {property.id.slice(0, 8)}
            </span>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-6 leading-tight">
            {property.address}
          </h1>

          <div className="flex items-center gap-6 mb-12 py-6 border-y border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                <Maximize2 size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Space</span>
                <span className="font-bold text-slate-900">{property.sqft} SQFT</span>
              </div>
            </div>
            <div className="h-10 w-px bg-slate-100"></div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                <Home size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Tenure</span>
                <span className="font-bold text-slate-900">{property.tenure}</span>
              </div>
            </div>
            <div className="h-10 w-px bg-slate-100"></div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                <Zap size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">EPC Rating</span>
                <span className="font-bold text-slate-900">{property.epc}</span>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Acquisition Strategy</h2>
              <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 text-blue-900 font-bold mb-3">
                    <ShieldAlert size={20} />
                    {property.neg_strategy}
                  </div>
                  <p className="text-blue-800/70 text-sm leading-relaxed max-w-lg">
                    Based on a market duration of {property.dom} days, we recommend an {property.neg_strategy.toLowerCase().includes('aggressive') ? 'aggressive bidding posture' : 'entry at market value'}. 
                    The Realistic Price of £{property.realistic_price.toLocaleString()} represents a target entry point for immediate equity capture.
                  </p>
                </div>
                <TrendingDown className="absolute -right-4 -bottom-4 text-blue-900/5" size={160} />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Institutional Alpha Analysis</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-5 border border-slate-200 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-slate-900">Alpha Score</span>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                      property.alpha_score >= 8 ? 'bg-emerald-500 shadow-emerald-500/20' : 
                      property.alpha_score >= 5 ? 'bg-amber-500 shadow-amber-500/20' : 'bg-rose-500 shadow-rose-500/20'
                    }`}>
                      {property.alpha_score}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Location Score</span>
                      <span className="font-medium text-slate-900">High</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Value Proposition</span>
                      <span className="font-medium text-slate-900">{property.is_value_buy ? 'Excellent' : 'Stable'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Liquidity Rating</span>
                      <span className="font-medium text-slate-900">A+</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-slate-400" />
                    Market Metrics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Days on Market</span>
                      <span className="font-medium text-slate-900">{property.dom} days</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Price/SQM</span>
                      <span className="font-medium text-slate-900">£{property.price_per_sqm.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Last Verified</span>
                      <span className="font-medium text-slate-900">Today</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-6 sticky top-24">
            <div className="mb-6">
              <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider mb-1">Institutional Target</span>
              <div className="text-4xl font-bold text-slate-900">£{property.realistic_price.toLocaleString()}</div>
              <div className="text-sm text-slate-400 mt-1">
                List Price: <span className="line-through">£{property.list_price.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle2 size={18} className="text-emerald-500" />
                Verified Title Deeds
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle2 size={18} className="text-emerald-500" />
                No Outstanding Service Charges
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle2 size={18} className="text-emerald-500" />
                Institutional Grade Asset
              </div>
            </div>

            <div className="space-y-3">
              <a 
                href={property.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
              >
                Go to Source
                <ExternalLink size={18} />
              </a>
              <button className="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-95">
                Download PDF Report
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <MapPin size={20} />
                </div>
                <div className="text-xs text-slate-500">
                  Positioned in prime {property.area.split(' (')[0]}. High rental demand zone.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
