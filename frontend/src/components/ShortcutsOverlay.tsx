import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['J'], description: 'Next item' },
      { keys: ['K'], description: 'Previous item' },
      { keys: ['O'], description: 'Open detail / preview' },
      { keys: ['Esc'], description: 'Close panel / drawer' },
      { keys: ['G'], description: 'Go to Dashboard' },
      { keys: ['P'], description: 'Go to Properties' },
      { keys: ['M'], description: 'Go to Map' },
      { keys: ['I'], description: 'Go to Inbox' },
      { keys: ['C'], description: 'Go to Comparison' },
    ],
  },
  {
    title: 'Properties',
    shortcuts: [
      { keys: ['T'], description: 'Table view' },
      { keys: ['G'], description: 'Grid view' },
      { keys: ['S'], description: 'Toggle shortlist' },
      { keys: ['A'], description: 'Add to comparison' },
      { keys: ['/'], description: 'Focus search' },
    ],
  },
  {
    title: 'Inbox',
    shortcuts: [
      { keys: ['J'], description: 'Next lead' },
      { keys: ['K'], description: 'Previous lead' },
      { keys: ['A'], description: 'Approve lead' },
      { keys: ['R'], description: 'Reject lead' },
      { keys: ['M'], description: 'Metrics view' },
      { keys: ['F'], description: 'Floorplan view' },
      { keys: ['V'], description: 'Portal view' },
      { keys: ['L'], description: 'Focused peek (new window)' },
      { keys: ['Space'], description: 'Toggle selection' },
    ],
  },
  {
    title: 'Global',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Command palette' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
];

const ShortcutsOverlay: React.FC<ShortcutsOverlayProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-linear-card border border-linear-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden pointer-events-auto max-w-2xl w-full max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="px-6 py-4 border-b border-linear-border bg-linear-bg/80 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <Keyboard size={18} className="text-linear-accent" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                Keyboard Shortcuts
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-linear-text-muted hover:text-white hover:bg-linear-bg rounded-lg transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {SHORTCUT_GROUPS.map(group => (
              <div key={group.title}>
                <h3 className="text-[10px] font-black text-linear-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-linear-border" />
                  {group.title}
                  <div className="h-px flex-1 bg-linear-border" />
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map(shortcut => (
                    <div key={shortcut.keys.join('')} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-linear-bg/50 transition-colors">
                      <span className="text-xs text-linear-text-muted">{shortcut.description}</span>
                      <div className="flex items-center gap-1.5">
                        {shortcut.keys.map((key, i) => (
                          <React.Fragment key={i}>
                            <kbd className="px-2 py-1 bg-linear-bg border border-linear-border rounded-lg text-[10px] font-black text-white shadow-inner">
                              {key}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-[10px] text-linear-text-muted">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-linear-border bg-linear-bg/50 text-center">
            <span className="text-[10px] text-linear-text-muted font-bold uppercase tracking-widest">
              Press <kbd className="px-1.5 py-0.5 bg-linear-bg border border-linear-border rounded text-white">Esc</kbd> or click outside to close
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShortcutsOverlay;
