import { useEffect, useId, useRef } from 'react';

export function useModalAccessibility(isOpen, onClose) {
  const ref = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const modal = ref.current;
    if (!isOpen || !modal) return;
    const previousFocus = document.activeElement;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.tabIndex = -1;
    const heading = modal.querySelector('h1,h2,h3');
    if (heading) { heading.id ||= titleId; modal.setAttribute('aria-labelledby', heading.id); }
    const selector = 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]';
    const focusable = () => [...modal.querySelectorAll(selector)].filter(el => el.getClientRects().length);
    (focusable()[0] || modal).focus();
    const handleKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = focusable(), first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); modal.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    modal.addEventListener('keydown', handleKey);
    return () => { modal.removeEventListener('keydown', handleKey); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [isOpen, titleId]);
  // Event closure uses current callback without repeatedly resetting focus.
  return ref;
}
