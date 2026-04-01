import React, { useState } from 'react';
import { Tag, Check, ChevronDown } from 'lucide-react';
import type { ThesisTag } from '../hooks/useThesisTags';
import { THESIS_TAG_CONFIG, useThesisTags } from '../hooks/useThesisTags';
import ThesisTagBadge from './ThesisTagBadge';

interface ThesisTagFilterProps {
  selectedTags: ThesisTag[];
  onTagsChange: (tags: ThesisTag[]) => void;
}

const ThesisTagFilter: React.FC<ThesisTagFilterProps> = ({
  selectedTags,
  onTagsChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { getUsedTags } = useThesisTags();
  
  const usedTags = getUsedTags();

  const toggleTag = (tag: ThesisTag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearAll = () => {
    onTagsChange([]);
  };

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
          ${selectedTags.length > 0 
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
            : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-white hover:border-linear-accent'
          }
        `}
      >
        <Tag size={14} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Thesis</span>
        {selectedTags.length > 0 && (
          <span className="h-5 w-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
            {selectedTags.length}
          </span>
        )}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 z-50 bg-linear-card border border-linear-border rounded-xl shadow-2xl w-80 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="px-3 py-2 border-b border-linear-border flex items-center justify-between">
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                Filter by Investment Thesis
              </span>
              {selectedTags.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[9px] text-linear-text-muted hover:text-white uppercase tracking-widest transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Tag List */}
            <div className="p-2 max-h-72 overflow-y-auto custom-scrollbar">
              {usedTags.length > 0 ? (
                usedTags.map(tag => {
                  const config = THESIS_TAG_CONFIG[tag];
                  const isSelected = selectedTags.includes(tag);
                  
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`
                        w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left mb-1
                        ${isSelected 
                          ? 'bg-blue-500/10 border border-blue-500/30' 
                          : 'hover:bg-linear-bg border border-transparent'
                        }
                      `}
                    >
                      <div 
                        className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0"
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
                          className="text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: config.color }}
                        >
                          {config.label}
                        </div>
                        <div className="text-[9px] text-linear-text-muted">
                          {config.description}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <Tag size={24} className="mx-auto mb-2 text-linear-text-muted opacity-30" />
                  <div className="text-[10px] text-linear-text-muted">
                    No thesis tags used yet
                  </div>
                  <div className="text-[9px] text-linear-text-muted mt-1 opacity-60">
                    Tag properties to enable filtering
                  </div>
                </div>
              )}
            </div>

            {/* Active Filters Preview */}
            {selectedTags.length > 0 && (
              <div className="px-3 py-2 border-t border-linear-border bg-linear-bg/50">
                <div className="flex items-center gap-1 flex-wrap">
                  {selectedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="group"
                    >
                      <ThesisTagBadge tag={tag} size="sm" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ThesisTagFilter;
