import React, { useState } from 'react';
import { Tag, X, Layers, ChevronDown } from 'lucide-react';
import type { ThesisTag } from '../hooks/useThesisTags';
import { THESIS_TAG_CONFIG, useThesisTags } from '../hooks/useThesisTags';
import ThesisTagBadge from './ThesisTagBadge';

interface BatchTagPanelProps {
  selectedIds: string[];
  onClose: () => void;
  onComplete?: () => void;
}

const BatchTagPanel: React.FC<BatchTagPanelProps> = ({
  selectedIds,
  onClose,
  onComplete
}) => {
  const { batchAddTag, batchRemoveTag, batchClearTags, getTags } = useThesisTags();
  const [showTagMenu, setShowTagMenu] = useState(false);

  const handleBatchAdd = (tag: ThesisTag) => {
    batchAddTag(selectedIds, tag);
    setShowTagMenu(false);
    onComplete?.();
  };

  const handleBatchRemove = (tag: ThesisTag) => {
    batchRemoveTag(selectedIds, tag);
    onComplete?.();
  };

  const handleClearAll = () => {
    batchClearTags(selectedIds);
    onComplete?.();
  };

  // Get tags that exist on ALL selected properties
  const commonTags = selectedIds.reduce<ThesisTag[]>((acc, id) => {
    const propTags = getTags(id);
    if (acc.length === 0) return propTags;
    return acc.filter(tag => propTags.includes(tag));
  }, []);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-linear-card border border-linear-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-linear-bg/80 border-b border-linear-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Layers size={16} className="text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-widest">
                Batch Thesis Tagging
              </div>
              <div className="text-[10px] text-linear-text-muted">
                {selectedIds.length} properties selected
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-linear-text-muted hover:text-white hover:bg-linear-bg rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex items-center gap-4">
          {/* Add Tag */}
          <div className="relative">
            <button
              onClick={() => setShowTagMenu(!showTagMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-all"
            >
              <Tag size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Add Tag</span>
              <ChevronDown size={12} />
            </button>

            {showTagMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTagMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 z-50 bg-linear-card border border-linear-border rounded-xl shadow-2xl w-64 overflow-hidden">
                  <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {Object.entries(THESIS_TAG_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleBatchAdd(key as ThesisTag)}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-linear-bg transition-all text-left"
                      >
                        <div 
                          className="h-4 w-4 rounded"
                          style={{ backgroundColor: config.color }}
                        />
                        <span 
                          className="text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: config.color }}
                        >
                          {config.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Common Tags */}
          {commonTags.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-6 w-px bg-linear-border" />
              <div className="flex items-center gap-1">
                {commonTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleBatchRemove(tag)}
                    className="group"
                    title="Click to remove from all"
                  >
                    <ThesisTagBadge tag={tag} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear All */}
          {commonTags.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-linear-text-muted hover:text-white transition-colors"
            >
              <X size={12} />
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchTagPanel;
