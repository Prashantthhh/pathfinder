/**
 * Speech bubble for Nova. With `live`, screen readers announce text changes
 * (used for quiz reactions); otherwise it is plain content.
 */
export default function NovaBubble({ children, live = false, className = '' }) {
  const props = live ? { role: 'status', 'aria-live': 'polite' } : {};
  return (
    <div className={`bubble ${className}`} {...props}>
      {children}
    </div>
  );
}
