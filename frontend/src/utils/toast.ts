/**
 * toast.ts — FE-232: Shared toast utilities
 * Simple DOM-injected toasts matching existing pattern in usePipeline.ts / usePropertyRank.ts.
 * No external dependency required.
 */
type ToastVariant = 'success' | 'error' | 'info';

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: string; iconText: string }> = {
  success: {
    bg: 'bg-retro-green/90',
    border: 'border-retro-green/30',
    icon: '✓',
    iconText: 'text-retro-green',
  },
  error: {
    bg: 'bg-rose-500/90',
    border: 'border-rose-400/30',
    icon: '⚠',
    iconText: 'text-rose-200',
  },
  info: {
    bg: 'bg-blue-500/90',
    border: 'border-blue-400/30',
    icon: 'i',
    iconText: 'text-blue-200',
  },
};

export function showToast(message: string, variant: ToastVariant = 'info', duration = 3500) {
  const style = VARIANT_STYLES[variant];
  const toast = document.createElement('div');
  toast.className = [
    'fixed bottom-6 right-6 z-[9999]',
    'px-4 py-3 text-white text-xs font-bold rounded-xl shadow-2xl',
    'border flex items-center gap-2 max-w-sm',
    'animate-fade-in',
    style.bg,
    style.border,
  ].join(' ');

  toast.innerHTML = `
    <span class="flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-black ${style.iconText}" style="background:rgba(255,255,255,0.15)">${style.icon}</span>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
