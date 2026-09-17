import awsIcon from '../assets/aws_icon.jpeg';

export default function Footer() {
  const socials = [
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/awsbuilder_vit?igsh=bXR1M2hjdzlxaGlp&utm_source=qr',
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
        </svg>
      ),
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/company/awsbuilder-vit/',
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
          <rect x="2" y="9" width="4" height="12"/>
          <circle cx="4" cy="4" r="2"/>
        </svg>
      ),
    },
    {
      label: 'GitHub',
      href: 'https://github.com/AWS-Student-Builder-Group-VIT',
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-background w-full border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">

        {/* Left — Brand */}
        <div className="flex flex-col gap-3">
          <div className="font-headline-md text-headline-md text-white flex items-center gap-2 uppercase tracking-widest">
          <img src={awsIcon} alt="AWS Club Logo" className="w-7 h-7 rounded-full object-cover" />
            AWS STUDENT BUILDER GROUP @ VIT
          </div>
          <p className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest">
            © 2026 AWS STUDENT BUILDER GROUP @ VIT VELLORE. ARCHITECTED FOR THE CLOUD.
          </p>
        </div>

        {/* Right — Social Icons */}
        <div className="flex items-center gap-3">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              className="group flex items-center justify-center w-10 h-10 rounded-sm border border-white/10 text-on-surface-variant hover:text-primary-container hover:border-primary-container/40 transition-all duration-300"
              title={s.label}
            >
              {s.svg}
            </a>
          ))}
        </div>

      </div>
    </footer>
  );
}
