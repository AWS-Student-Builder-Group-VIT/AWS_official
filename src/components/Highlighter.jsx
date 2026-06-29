import { useEffect, useRef } from 'react';
import { annotate } from 'rough-notation';

/**
 * Highlighter — uses rough-notation to render an authentic hand-drawn
 * marker highlight or underline, animated every time the element scrolls
 * into view (replays on each entry).
 *
 * Props:
 *  - action:      "highlight" | "underline" | "circle" | "box" | "bracket"
 *                 (default: "highlight")
 *  - color:       any CSS color string — use rgba() for dark backgrounds
 *  - strokeWidth: line thickness in px
 *  - iterations:  how many pen strokes are drawn (default: 1)
 *  - children:    the text to annotate
 */
export function Highlighter({
  action = 'highlight',
  color = 'rgba(255, 214, 10, 0.45)',
  strokeWidth,
  iterations = 1,
  children,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const config = {
      type: action,
      color,
      animate: true,
      animationDuration: 800,
      iterations,
      multiline: true,
    };
    if (strokeWidth !== undefined) config.strokeWidth = strokeWidth;

    // Create the annotation once, but show/hide it on each scroll entry
    const annotation = annotate(el, config);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Element entered viewport — replay animation
          annotation.hide();
          annotation.show();
        } else {
          // Element left viewport — remove so it re-animates next time
          annotation.hide();
        }
      },
      { threshold: 0.4, rootMargin: '-5% 0px' }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      annotation.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span ref={ref}>{children}</span>;
}
