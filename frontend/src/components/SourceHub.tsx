import React from 'react';
import { ExternalLink, ArrowRight } from 'lucide-react';

interface SourceHubProps {
  links: string[];
  variant?: 'compact' | 'full';
}

function linkLabel(url: string): string {
  if (url.includes('rightmove')) return 'Rightmove';
  if (url.includes('zoopla')) return 'Zoopla';
  if (url.includes('onthemarket')) return 'OnTheMarket';
  if (url.includes('primeagent') || url.includes('agent')) return 'Agent Portal';
  return 'Source Link';
}

const SourceHub: React.FC<SourceHubProps> = ({ links, variant = 'full' }) => {
  const validLinks = links.filter(l => typeof l === 'string' && l.length > 0);

  if (validLinks.length === 0) return null;

  return (
    <div className="w-full">
      {variant === 'full' ? (
        // Desktop: row of pill buttons — always visible, no hover required
        <div className="flex flex-wrap gap-2">
          {validLinks.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-black rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-zinc-200 transition-colors active:scale-95"
            >
              {linkLabel(url)}
              <ExternalLink size={10} />
            </a>
          ))}
        </div>
      ) : (
        // Compact: list items
        <div className="flex flex-col gap-1">
          {validLinks.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 bg-linear-bg border border-white/10 rounded-xl text-[11px] font-bold text-linear-text-muted hover:text-white hover:border-linear-accent transition-all"
            >
              <span className="truncate">{linkLabel(url)}</span>
              <ArrowRight size={12} className="text-linear-accent shrink-0 ml-2" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default SourceHub;
