import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  DollarSign,
  Landmark,
  Percent,
  Clock,
  TrendingUp,
  Info,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useAffordability } from '../hooks/useAffordability';
import { useFinancialData } from '../hooks/useFinancialData';
import { extractValue } from '../types/macro';
import LTVMatchBadge from '../components/LTVMatchBadge';
import BudgetSlider from '../components/BudgetSlider';
import LoadingNode from '../components/LoadingNode';

const AffordabilitySettings: React.FC = () => {
  const { macroData, loading } = useFinancialData();
  const {
    monthlyBudget,
    mortgageRate,
    mortgageRates,
    getAffordablePrice,
    getBudgetProfile,
    getLTVMatchScore,
    termYears,
    updateTermYears
  } = useAffordability();

  const [expandedSection, setExpandedSection] = useState<string | null>('budget');

  const affordableRange = useMemo(() => {
    const min = getAffordablePrice(monthlyBudget) * 0.85;
    const max = getAffordablePrice(monthlyBudget);
    return { min: Math.round(min), max: Math.round(max) };
  }, [monthlyBudget, getAffordablePrice]);

  // Calculate estimated monthly payments at different property prices
  const priceScenarios = useMemo(() => {
    const scenarios = [
      { label: 'Entry Level', price: 500000, ltv: '90%' },
      { label: 'Mid-Tier', price: 750000, ltv: '85%' },
      { label: 'Core Asset', price: 1000000, ltv: '75%' },
      { label: 'Ultra-Prime', price: 1500000, ltv: '75%' },
    ];

    return scenarios.map(s => {
      const profile = getBudgetProfile(s.price);
      const ltvScore = getLTVMatchScore(s.price);
      return { ...s, profile, ltvScore };
    });
  }, [getBudgetProfile, getLTVMatchScore]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <LoadingNode label="Loading Financial Data..." />
    </div>
  );

  const boeBaseRate = extractValue(macroData?.economic_indicators?.boe_base_rate) ?? 3.75;
  const mpcNextMeeting = extractValue(macroData?.economic_indicators?.mpc_next_meeting) ?? 'TBD';

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-linear-border pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-card border border-linear-border flex items-center justify-center text-linear-accent">
              <Calculator size={20} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tighter text-white">Affordability Settings</h1>
              <p className="text-linear-text-muted text-[11px] font-bold uppercase tracking-[0.2em] opacity-80">
                Personal Mortgage Tracker
              </p>
            </div>
          </div>
          <p className="text-linear-text-muted text-sm max-w-xl leading-relaxed">
            Configure your monthly budget, LTV band, and loan term. All calculations use live BoE mortgage rates sourced from <span className="text-white font-medium">macro_trend.json</span>.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-linear-card border border-linear-border rounded-xl">
            <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1">Current Rate</div>
            <div className="text-lg font-bold text-white tracking-tight">{mortgageRate.toFixed(2)}% <span className="text-[10px] text-linear-text-muted font-normal">5yr fixed</span></div>
          </div>
          <Link
            to="/mortgage"
            className="px-4 py-2 bg-linear-accent/10 border border-linear-accent/20 rounded-xl text-xs font-bold text-linear-accent hover:bg-linear-accent/20 transition-colors flex items-center gap-2"
          >
            <ExternalLink size={14} />
            Mortgage Intel
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-linear-card border border-linear-border rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={14} className="text-blue-400" />
            <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Monthly Budget</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            £{monthlyBudget.toLocaleString()}
          </div>
          <div className="text-[10px] text-linear-text-muted mt-1">per month</div>
        </div>

        <div className="p-5 bg-linear-card border border-linear-border rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Max Affordable</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            £{(affordableRange.max / 1000).toFixed(0)}K
          </div>
          <div className="text-[10px] text-linear-text-muted mt-1">at {mortgageRate.toFixed(2)}%</div>
        </div>

        <div className="p-5 bg-linear-card border border-linear-border rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={14} className="text-blue-400" />
            <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">BoE Base Rate</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {boeBaseRate.toFixed(2)}%
          </div>
          <div className="text-[10px] text-linear-text-muted mt-1">next: {mpcNextMeeting}</div>
        </div>

        <div className="p-5 bg-linear-card border border-linear-border rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Percent size={14} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Spread to Base</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            +{(mortgageRate - boeBaseRate).toFixed(2)}%
          </div>
          <div className="text-[10px] text-linear-text-muted mt-1">mortgage vs BoE</div>
        </div>
      </div>

      {/* Main Settings */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Budget Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget Slider Section */}
          <div className="bg-linear-card border border-linear-border rounded-3xl overflow-hidden">
            <button
              onClick={() => toggleSection('budget')}
              className="w-full p-6 flex items-center justify-between hover:bg-linear-bg/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <DollarSign size={20} />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest">Monthly Budget Configuration</h2>
                  <p className="text-[10px] text-linear-text-muted mt-1">Set your maximum monthly mortgage payment capacity</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-white">£{monthlyBudget.toLocaleString()}</span>
                <ChevronDown size={20} className={`text-linear-text-muted transition-transform ${expandedSection === 'budget' ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {expandedSection === 'budget' && (
              <div className="px-6 pb-6 border-t border-linear-border">
                <div className="pt-6">
                  <BudgetSlider />
                </div>
              </div>
            )}
          </div>

          {/* Live Rates Section */}
          <div className="bg-linear-card border border-linear-border rounded-3xl overflow-hidden">
            <button
              onClick={() => toggleSection('rates')}
              className="w-full p-6 flex items-center justify-between hover:bg-linear-bg/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <TrendingUp size={20} />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest">Live Mortgage Rates</h2>
                  <p className="text-[10px] text-linear-text-muted mt-1">Sourced from macro_trend.json via useFinancialData</p>
                </div>
              </div>
              <ChevronDown size={20} className={`text-linear-text-muted transition-transform ${expandedSection === 'rates' ? 'rotate-180' : ''}`} />
            </button>

            {expandedSection === 'rates' && (
              <div className="px-6 pb-6 border-t border-linear-border">
                <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { ltv: '90%', label: 'Entry Gate', rate: mortgageRates.rate_90, color: 'rose' },
                    { ltv: '85%', label: 'Mid-Tier', rate: mortgageRates.rate_85, color: 'amber' },
                    { ltv: '75%', label: 'Core Asset', rate: mortgageRates.rate_75, color: 'emerald' },
                    { ltv: '60%', label: 'Ultra-Prime', rate: mortgageRates.rate_60, color: 'blue' },
                  ].map((band) => (
                    <div
                      key={band.ltv}
                      className={`p-4 rounded-xl border ${
                        band.color === 'rose' ? 'bg-rose-500/5 border-rose-500/20' :
                        band.color === 'amber' ? 'bg-amber-500/5 border-amber-500/20' :
                        band.color === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/20' :
                        'bg-blue-500/5 border-blue-500/20'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">{band.label}</div>
                      <div className="text-2xl font-bold text-white tracking-tighter">{band.rate.toFixed(2)}%</div>
                      <div className="text-[9px] text-linear-text-muted mt-1">{band.ltv} LTV, 5yr Fixed</div>
                      <div className="text-[9px] text-linear-accent mt-2">
                        +{(band.rate - boeBaseRate).toFixed(2)}% to base
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-start gap-3">
                  <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-linear-text-muted leading-relaxed">
                    Rates are fetched live from <span className="text-white font-medium">macro_trend.json</span> via the <span className="text-white font-medium">useFinancialData</span> hook.
                    These represent market-leading 5-year fixed rates from the Bank of England Effective Interest Rates database.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Loan Term Section */}
          <div className="bg-linear-card border border-linear-border rounded-3xl overflow-hidden">
            <button
              onClick={() => toggleSection('term')}
              className="w-full p-6 flex items-center justify-between hover:bg-linear-bg/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Clock size={20} />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest">Loan Term</h2>
                  <p className="text-[10px] text-linear-text-muted mt-1">Standard UK residential mortgage term</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-white">{termYears} Years</span>
                <ChevronDown size={20} className={`text-linear-text-muted transition-transform ${expandedSection === 'term' ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {expandedSection === 'term' && (
              <div className="px-6 pb-6 border-t border-linear-border">
                <div className="pt-6">
                  {/* Term segmented control */}
                  <div className="flex bg-linear-bg rounded-xl border border-linear-border p-1.5 gap-1">
                    {([15, 20, 25, 30] as const).map((term) => (
                      <button
                        key={term}
                        onClick={() => updateTermYears(term)}
                        className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                          termYears === term
                            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                            : 'text-linear-text-muted hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {term}yr
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold text-white">{termYears}-Year Term</div>
                        <p className="text-[10px] text-linear-text-muted mt-1">UK residential mortgages typically range from 15-30 years</p>
                      </div>
                      <div className="text-3xl font-bold text-white">{termYears} <span className="text-sm text-linear-text-muted font-normal">years</span></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {([15, 20, 25, 30] as const).map((term) => {
                        const diff = term - termYears;
                        return (
                          <div key={term} className="text-center">
                            <div className={`text-[10px] font-bold ${term === termYears ? 'text-purple-400' : 'text-linear-text-muted'}`}>{term}yr</div>
                            <div className={`text-[9px] font-mono ${diff === 0 ? 'text-purple-400' : diff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {diff === 0 ? '← selected' : `${diff > 0 ? '+' : ''}${diff}yr`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-[10px] text-linear-text-muted">
                      Shorter terms = higher payments, less total interest. Longer terms = lower payments, more total interest.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Summary & Scenarios */}
        <div className="space-y-6">
          {/* Affordable Range Card */}
          <div className="p-6 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-3xl">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-blue-400" />
              <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Your Affordable Range</span>
            </div>
            <div className="text-4xl font-bold text-white tracking-tighter mb-2">
              £{(affordableRange.min / 1000).toFixed(0)}K - £{(affordableRange.max / 1000).toFixed(0)}K
            </div>
            <p className="text-[10px] text-linear-text-muted">
              Based on £{monthlyBudget.toLocaleString()}/month at {mortgageRate.toFixed(2)}% with 15% deposit
            </p>
          </div>

          {/* LTV Match Score */}
          <div className="p-6 bg-linear-card border border-linear-border rounded-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Percent size={16} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">LTV Match Analysis</span>
            </div>
            <LTVMatchBadge score={getLTVMatchScore(affordableRange.max)} size="lg" />
            <div className="mt-4 space-y-2 text-[10px] text-linear-text-muted">
              <div className="flex justify-between">
                <span>At 90% LTV:</span>
                <span className="text-rose-400">£{(affordableRange.max * 0.85 / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex justify-between">
                <span>At 85% LTV:</span>
                <span className="text-amber-400">£{(affordableRange.max * 0.85 / 0.85 / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex justify-between">
                <span>At 75% LTV:</span>
                <span className="text-emerald-400">£{(affordableRange.max * 0.85 / 0.75 / 1000).toFixed(0)}K</span>
              </div>
            </div>
          </div>

          {/* Price Scenarios */}
          <div className="bg-linear-card border border-linear-border rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-linear-border">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Payment Scenarios</h3>
              <p className="text-[9px] text-linear-text-muted mt-1">Estimated monthly payments at different price points</p>
            </div>
            <div className="divide-y divide-linear-border">
              {priceScenarios.map((scenario) => (
                <div key={scenario.label} className="p-4 hover:bg-linear-bg/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-white">{scenario.label}</span>
                    <span className="text-[10px] font-bold text-linear-text-muted">£{(scenario.price / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-linear-text-muted">Monthly: <span className="text-white font-medium">£{scenario.profile.monthlyPayment.toLocaleString()}</span></span>
                    <span className={`font-bold ${
                      scenario.ltvScore.score >= 80 ? 'text-emerald-400' :
                      scenario.ltvScore.score >= 60 ? 'text-amber-400' :
                      'text-rose-400'
                    }`}>
                      {scenario.ltvScore.band}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="p-6 bg-linear-bg/50 border border-linear-border rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Info size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-2">About This Calculator</h3>
            <p className="text-[11px] text-linear-text-muted leading-relaxed max-w-3xl">
              This affordability calculator uses live mortgage rates from <span className="text-white font-medium">macro_trend.json</span>, fetched via the <span className="text-white font-medium">useFinancialData</span> hook.
              All rates represent market-leading 5-year fixed mortgage products at various LTV bands. The calculator does <span className="text-amber-400">not</span> include additional costs such as broker fees,
              arrangement fees, or life insurance. For accurate affordability assessments, consult with a qualified mortgage broker.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffordabilitySettings;
