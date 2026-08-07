/**
 * The "Operations Portal ᵃˡᵖʰᵃ" product wordmark (feature 160). Shared by the console top bar and the
 * login page so the treatment stays identical. Size it via the `className` font-size (e.g.
 * `text-[15px]`, `text-2xl`) — "alpha" is sized/offset in `em`, so it scales and stays 25% of the
 * wordmark's size above its center line at any font size.
 */
export function ProductWordmark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap font-semibold ${className ?? ''}`}
    >
      Operations Portal
      <span className="relative -top-[0.379em] text-[0.66em] font-semibold lowercase tracking-wide text-red-600">
        alpha
      </span>
    </span>
  );
}
