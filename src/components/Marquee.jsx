const MARQUEE_TEXT = 'AWS STUDENT BUILDER GROUP ✦ VIT VELLORE ✦ LEARN , BUILD & DEPLOY ✦ ';

export default function Marquee() {
  return (
    <div className="w-full overflow-hidden bg-background border-y border-white/10 py-4 relative z-20">
      <div className="flex whitespace-nowrap animate-marquee font-headline-md text-label-md text-on-surface-variant tracking-widest uppercase">
        <span className="mx-4">{MARQUEE_TEXT}</span>
        <span className="mx-4">{MARQUEE_TEXT}</span>
        <span className="mx-4">{MARQUEE_TEXT}</span>
        <span className="mx-4">{MARQUEE_TEXT}</span>
      </div>
    </div>
  );
}
