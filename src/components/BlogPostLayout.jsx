import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import BLOG_DATA from '../data/blogData';
import { AnimatedCircularProgressBar } from './AnimatedCircularProgressBar';

/* ───────── helper: category color map ───────── */
const CAT_COLORS = {
  purple: { bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)', text: '#c084fc' },
  blue:   { bg: 'rgba(100,180,255,0.1)', border: 'rgba(100,180,255,0.2)', text: '#64b4ff' },
  green:  { bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)',  text: '#34d399' },
  orange: { bg: 'rgba(255,153,0,0.1)',   border: 'rgba(255,153,0,0.2)',   text: '#ff9900' },
};

export default function BlogPostLayout({ slug, children }) {
  const navigate = useNavigate();
  const blog = BLOG_DATA.find((b) => b.slug === slug);
  const catColor = CAT_COLORS[blog?.categoryColor] || CAT_COLORS.orange;

  /* ─── reading progress ─── */
  const articleRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!articleRef.current) return;
      const el = articleRef.current;
      const rect = el.getBoundingClientRect();
      const total = el.scrollHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      setProgress(Math.min(100, Math.round((scrolled / total) * 100)));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ─── related posts (all except current) ─── */
  const relatedPosts = BLOG_DATA.filter((b) => b.slug !== slug).slice(0, 3);

  if (!blog) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface relative">
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,153,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,153,0,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ═══ NAV BAR ═══ */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-8 py-3 border-b border-primary-container/12 backdrop-blur-md"
        style={{ background: 'rgba(10,12,16,0.92)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-label-sm text-[11px] text-primary-container border border-primary-container/30 px-3 py-1.5 rounded cursor-pointer hover:bg-primary-container/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            BLOGS
          </button>
          <span className="font-headline-lg text-[18px] text-white tracking-widest hidden sm:inline">
            AWS × VIT
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="font-label-sm text-[10px] text-on-surface-variant border border-white/10 px-3 py-1.5 rounded cursor-pointer hover:bg-white/5 transition-colors flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <motion.header
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 px-6 md:px-8 py-10 md:py-14 border-b border-primary-container/10 max-w-6xl mx-auto"
      >
        {/* Tags */}
        <div className="flex items-center gap-2 mb-5">
          {blog.featured && (
            <span
              className="font-label-sm text-[9.5px] tracking-widest uppercase px-3 py-1 rounded-sm border"
              style={{ background: CAT_COLORS.orange.bg, borderColor: CAT_COLORS.orange.border, color: CAT_COLORS.orange.text }}
            >
              Featured
            </span>
          )}
          <span
            className="font-label-sm text-[9.5px] tracking-widest uppercase px-3 py-1 rounded-sm border"
            style={{ background: catColor.bg, borderColor: catColor.border, color: catColor.text }}
          >
            {blog.category}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-headline-lg text-[36px] md:text-[48px] text-white leading-[1.05] tracking-wide mb-3 max-w-[680px]">
          {blog.title}
        </h1>
        <p className="font-body-md text-[14px] text-on-surface-variant leading-relaxed max-w-[600px] mb-6">
          {blog.subtitle}. {blog.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-label-sm text-[10px] font-bold text-primary-container border border-primary-container/28"
              style={{ background: 'rgba(255,153,0,0.12)' }}
            >
              {blog.initials}
            </div>
            <div>
              <div className="font-body-md text-[13px] text-white font-medium">{blog.author}</div>
              <div className="font-label-sm text-[11px] text-on-surface-variant">{blog.role}</div>
            </div>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div className="flex items-center gap-1.5 font-label-sm text-[10px] text-on-surface-variant">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {blog.readTime} read
          </div>
          <div className="flex items-center gap-1.5 font-label-sm text-[10px] text-on-surface-variant">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {blog.date}
          </div>
        </div>
      </motion.header>

      {/* ═══ LAYOUT: article + sidebar ═══ */}
      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-0 items-start">
        {/* Article */}
        <motion.article
          ref={articleRef}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="blog-article px-6 md:px-8 py-8 lg:border-r border-primary-container/8"
        >
          {children}

          {/* Tag pills at bottom */}
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-white/7">
            {blog.tags.map((tag) => (
              <span
                key={tag}
                className="font-label-sm text-[9px] tracking-wider text-on-surface-variant px-3 py-1 rounded-full border border-white/10 hover:border-primary-container/30 hover:text-primary-container transition-colors cursor-pointer"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.article>

        {/* Sidebar — sticks right below the nav */}
        <aside
          className="hidden lg:flex flex-col gap-5 p-5"
          style={{ position: 'sticky', top: '53px', alignSelf: 'start', maxHeight: 'calc(100vh - 53px)', overflowY: 'auto' }}
        >
          {/* Reading Progress — Circular */}
          <div className="border border-white/7 rounded-lg p-4 flex flex-col items-center gap-3" style={{ background: '#111827' }}>
            <div className="font-label-sm text-[9px] text-primary-container tracking-widest uppercase">
              Reading Progress
            </div>
            <AnimatedCircularProgressBar
              value={progress}
              max={100}
              gaugePrimaryColor="#FF9900"
              gaugeSecondaryColor="rgba(255,153,0,0.10)"
            />
            <div className="text-center">
              <div className="font-label-sm text-[9px] text-on-surface-variant">
                ~{Math.max(1, Math.round(parseInt(blog.readTime) * (1 - progress / 100)))} min left
              </div>
            </div>
          </div>

          {/* Related Posts */}
          <div className="border border-white/7 rounded-lg p-4" style={{ background: '#111827' }}>
            <div className="font-label-sm text-[9px] text-primary-container tracking-widest uppercase mb-3">
              Related posts
            </div>
            {relatedPosts.map((rp) => (
              <Link
                key={rp.slug}
                to={`/blog/${rp.slug}`}
                className="flex flex-col gap-1 py-3 border-b border-white/15 last:border-b-0 group"
              >
                <span
                  className="font-label-sm text-[8px] tracking-widest uppercase"
                  style={{ color: CAT_COLORS[rp.categoryColor]?.text || '#ff9900' }}
                >
                  {rp.category}
                </span>
                <span className="font-body-md text-[12px] text-on-surface-variant group-hover:text-white leading-snug transition-colors">
                  {rp.title}
                </span>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      {/* ═══ BLOG ARTICLE STYLES ═══ */}
      <style>{`
        .blog-article .section-label {
          font-family: var(--font-label-sm);
          font-size: 9px;
          color: #ff9900;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 0.6rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .blog-article .section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,153,0,0.15);
        }
        .blog-article h2 {
          font-family: var(--font-headline-lg);
          font-size: 1.35rem;
          color: #fff;
          letter-spacing: 0.5px;
          margin: 2rem 0 0.6rem;
        }
        .blog-article h3 {
          font-family: var(--font-headline-md);
          font-size: 1.1rem;
          color: #e2e8f0;
          letter-spacing: 0.3px;
          margin: 1.5rem 0 0.5rem;
        }
        .blog-article p {
          font-family: var(--font-body-md);
          font-size: 13.5px;
          color: #a0aab8;
          line-height: 1.75;
          margin-bottom: 1rem;
        }
        .blog-article .quote-block {
          border-left: 2px solid #ff9900;
          padding: 0.8rem 1.2rem;
          margin: 1.25rem 0;
          background: rgba(255,153,0,0.05);
          border-radius: 0 6px 6px 0;
        }
        .blog-article .quote-block p {
          color: #e2e8f0;
          font-style: italic;
          margin: 0;
        }
        .blog-article .code-block {
          background: #111827;
          border: 1px solid rgba(255,153,0,0.15);
          border-radius: 6px;
          padding: 1rem 1.25rem;
          margin: 1.2rem 0;
          font-family: var(--font-label-sm);
          font-size: 11.5px;
          color: #a0aab8;
          line-height: 1.7;
          overflow-x: auto;
        }
        .blog-article .code-block .comment { color: #4b5563; }
        .blog-article .code-block .keyword { color: #ff9900; }
        .blog-article .code-block .string  { color: #34d399; }
        .blog-article .blog-img {
          width: 100%;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.07);
          margin: 1.25rem 0;
        }
        .blog-article .blog-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.25rem 0;
          font-family: var(--font-body-md);
          font-size: 12px;
        }
        .blog-article .blog-table th {
          font-family: var(--font-label-sm);
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #ff9900;
          text-align: left;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255,153,0,0.2);
          background: rgba(255,153,0,0.05);
        }
        .blog-article .blog-table td {
          padding: 8px 12px;
          color: #a0aab8;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .blog-article .blog-table tr:hover td {
          background: rgba(255,153,0,0.03);
        }
        .blog-article .callout-box {
          background: rgba(255,153,0,0.06);
          border: 1px solid rgba(255,153,0,0.18);
          border-radius: 8px;
          padding: 1rem 1.25rem;
          margin: 1.25rem 0;
        }
        .blog-article .callout-box p {
          color: #e2e8f0;
          margin-bottom: 0.4rem;
        }
        .blog-article .callout-box p:last-child {
          margin-bottom: 0;
        }
        .blog-article ul, .blog-article ol {
          font-family: var(--font-body-md);
          font-size: 13.5px;
          color: #a0aab8;
          line-height: 1.75;
          margin: 0.5rem 0 1rem 1.5rem;
        }
        .blog-article li {
          margin-bottom: 0.3rem;
        }
        .blog-article strong {
          color: #e2e8f0;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
