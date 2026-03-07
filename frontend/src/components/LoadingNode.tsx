import React from 'react';

interface LoadingNodeProps {
  label?: string;
  className?: string;
}

const LoadingNode: React.FC<LoadingNodeProps> = ({ 
  label = "Syncing Prime Assets...", 
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 ${className}`}>
      <div className="relative">
        <div className="h-12 w-12 border-2 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 h-12 w-12 border-2 border-transparent border-b-indigo-500/30 rounded-full animate-spin [animation-duration:2s]"></div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] animate-pulse">
          {label}
        </span>
        <div className="flex gap-1">
          <div className="h-1 w-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-1 w-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-1 w-1 bg-blue-500 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingNode;
