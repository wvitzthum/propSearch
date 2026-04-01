import React, { useState } from 'react';
import { Tag, Plus, X, Check } from 'lucide-react';
import type { ThesisTag } from '../hooks/useThesisTags';
import { THESIS_TAG_CONFIG, useThesisTags } from '../hooks/useThesisTags';
import ThesisTagBadge from './ThesisTagBadge';

interface ThesisTagSelectorProps {
  propertyId: string;
  currentTags: ThesisTag[];
  size?: 'sm' | 'md' | 'lg';
  onTagChange?: () => void;
}

const ThesisTagSelector: React.FC<ThesisTagSelectorProps> = ({
  propertyId,
  currentTags,
  size = 'md',
  onTagChange
}) => {
  const { removeTag, toggleTag } = useThesisTags();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = (tag: ThesisTag) => {
    toggleTag(propertyId, tag);
    onTagChange?.();
  };

  const filteredTags = Object.entries(THESIS_TAG_CONFIG).filter(([key, config]) => {
    const query = searchQuery.toLowerCase();
    return key.includes(query) || config.label.toLowerCase().includes(query);
  });

  const isSmall = size === 'sm';

  return (
    <div className="relative">
      {/* Current Tags Display */}
      <div className="flex flex-wrap items-center gap-1.5">
        {currentTags.length > 0 ? (
          currentTags.map(tag => (
            <ThesisTagBadge
              key={tag}
              tag={tag}
              size={isSmall ? 'sm' : 'md'}
              removable
              onRemove={() => { removeTag(propertyId, tag); onTagChange?.(); }}
            />
          ))
        ) : (
          <span className="text-[10px] text-linear-text-muted italic">
            No thesis tags
          </span>
        )}
        
        {/* Add Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            inline-flex items-center gap-1 rounded border transition-all
            ${isSmall ? 'px-1 py-0.5 text-[8px]' : 'px-2 py-1 text-[9px]'}
            bg-linear-card border-linear-border text-linear-text-muted 
            hover:text-white hover:border-linear-accent
          `}
        >
          <Plus size={isSmall ? 10 : 12} />
          <Tag size={isSmall ? 8 : 10} />
        </button>
      </div>

      {/* Selector Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-2 z-50 bg-linear-card border border-linear-border rounded-xl shadow-2xl shadow-black/50 w-72 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="p-3 border-b border-linear-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                  Investment Thesis
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-linear-text-muted hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-1.5 bg-linear-bg border border-linear-border rounded-lg text-xs text-white placeholder:text-linear-text-muted focus:outline-none focus:border-linear-accent/50"
              />
            </div>

            {/* Tag List */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
              {filteredTags.map(([key, config]) => {
                const tag = key as ThesisTag;
                const isSelected = currentTags.includes(tag);
                
                return (
                  <button
                    key={key}
                    onClick={() => handleToggle(tag)}
                    className={`
                      w-full flex items-start gap-3 p-2 rounded-lg transition-all text-left mb-1
                      ${isSelected 
                        ? 'bg-linear-accent/10 border border-linear-accent/30' 
                        : 'hover:bg-linear-bg border border-transparent'
                      }
                    `}
                  >
                    <div 
                      className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ 
                        backgroundColor: isSelected ? config.color : `${config.color}20`,
                        color: isSelected ? 'white' : config.color,
                        border: `1px solid ${config.color}40`
                      }}
                    >
                      {isSelected && <Check size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div 
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: config.color }}
                      >
                        {config.label}
                      </div>
                      <div className="text-[10px] text-linear-text-muted leading-tight mt-0.5">
                        {config.description}
                      </div>
                    </div>
                  </button>
                );
              })}
              
              {filteredTags.length === 0 && (
                <div className="py-6 text-center text-[10px] text-linear-text-muted">
                  No tags matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThesisTagSelector;
