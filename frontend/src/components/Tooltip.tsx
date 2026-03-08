import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  content?: string;
  methodology?: string;
  renderContent?: () => React.ReactNode;
  className?: string;
  width?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  content, 
  methodology, 
  renderContent,
  className = '',
  width = 'w-64'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible]);

  if (!content && !methodology && !renderContent) return <>{children}</>;

  const tooltipElement = (
    <div 
      ref={tooltipRef}
      className={`fixed z-[9999] -translate-x-1/2 mb-3 pointer-events-none transition-all duration-200 origin-bottom ${width} ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      style={{ 
        top: coords.top - 12, // Offset above trigger
        left: coords.left,
        transform: `translate(-50%, -100%) ${isVisible ? 'scale(1)' : 'scale(0.95)'}`
      }}
    >
      <div className={`p-4 bg-linear-card border border-linear-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200`}>
        {renderContent ? (
          renderContent()
        ) : (
          <>
            {content && (
              <div className={`${methodology ? 'mb-4' : ''}`}>
                <div className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] border-b border-linear-border/50 pb-2 mb-2">
                  Institutional Definition
                </div>
                <div className="text-[11px] text-white/70 leading-relaxed font-medium normal-case tracking-normal">
                  {content}
                </div>
              </div>
            )}
            {methodology && (
              <div>
                <div className="text-[9px] font-black text-retro-green uppercase tracking-[0.2em] border-b border-linear-border/50 pb-2 mb-2">
                  Calculation Methodology
                </div>
                <div className="text-[10px] text-white/60 leading-relaxed font-mono italic normal-case tracking-normal">
                  {methodology}
                </div>
              </div>
            )}
          </>
        )}
        {/* Pointer */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-linear-card" />
      </div>
    </div>
  );

  const portalRoot = document.getElementById('portal-root');

  return (
    <div 
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {portalRoot && createPortal(tooltipElement, portalRoot)}
    </div>
  );
};

export default Tooltip;
