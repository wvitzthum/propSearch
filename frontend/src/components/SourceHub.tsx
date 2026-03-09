import React from 'react';
import { ExternalLink, ArrowRight } from 'lucide-react';

interface SourceHubProps {
  links: string[];
  variant?: 'compact' | 'full';
}

const SourceHub: React.FC<SourceHubProps> = ({ links, variant = 'full' }) => {
  return (
    <div className="relative group/hub w-full">
      <button 
        className={`w-full flex items-center justify-center gap-2 font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl ${
          variant === 'full' 
            ? 'py-4 bg-white text-black rounded-xl text-xs hover:bg-zinc-200 shadow-white/5' 
            : 'py-3.5 bg-linear-card text-white border border-linear-border rounded-xl text-xs hover:border-linear-accent'
        }`}
      >
        Asset Source Hub
        <ExternalLink size={14} />
      </button>
      
      <div className="absolute bottom-full left-0 right-0 pb-2 mb-0 opacity-0 translate-y-2 pointer-events-none group-hover/hub:opacity-100 group-hover/hub:translate-y-0 group-hover/hub:pointer-events-auto transition-all z-50">
        <div className={`bg-linear-card border border-linear-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl p-2 ${
          variant === 'full' ? 'p-3' : 'p-2'
        }`}>
          <div className="flex flex-col gap-1">
            <div className="px-3 py-2 text-[9px] font-black text-linear-text-muted uppercase tracking-[0.2em] border-b border-linear-border mb-1">
              Select Verification Portal
            </div>
            {links.map((url, i) => (
              <a 
                key={i}
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 text-[10px] font-bold text-linear-text-muted hover:text-white hover:bg-linear-bg rounded-xl transition-all flex items-center justify-between group/link uppercase tracking-wider border border-transparent hover:border-linear-border"
              >
                <div className="flex flex-col gap-0.5 text-left truncate">
                  <span className="text-white truncate">
                    {url.includes('rightmove') ? 'Rightmove Institutional' : 
                     url.includes('zoopla') ? 'Zoopla Analytics' : 
                     'Direct Agent Portal'}
                  </span>
                  <span className="text-[8px] opacity-50 lowercase truncate max-w-[180px]">{url}</span>
                </div>
                <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-linear-accent shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceHub;
