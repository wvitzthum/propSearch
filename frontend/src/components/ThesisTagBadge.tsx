import React from 'react';
import { X } from 'lucide-react';
import type { ThesisTag } from '../hooks/useThesisTags';
import { THESIS_TAG_CONFIG } from '../hooks/useThesisTags';

interface ThesisTagBadgeProps {
  tag: ThesisTag;
  size?: 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}

const ThesisTagBadge: React.FC<ThesisTagBadgeProps> = ({
  tag,
  size = 'sm',
  removable = false,
  onRemove,
  onClick
}) => {
  const config = THESIS_TAG_CONFIG[tag];
  
  const sizeClasses = size === 'sm' 
    ? 'text-[9px] px-1.5 py-0.5' 
    : 'text-[10px] px-2 py-1';
  
  const iconSize = size === 'sm' ? 8 : 10;

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 rounded font-bold uppercase tracking-widest
        transition-all cursor-default
        ${sizeClasses}
        ${onClick ? 'cursor-pointer hover:brightness-110' : ''}
      `}
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    >
      {config.label}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:brightness-150 transition-all rounded-sm"
        >
          <X size={iconSize} />
        </button>
      )}
    </span>
  );
};

export default ThesisTagBadge;
