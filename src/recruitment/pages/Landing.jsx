import { Link } from 'react-router-dom';
import { ArrowRight, CloudCog, Code2, Lightbulb, ClipboardList, RadioTower } from 'lucide-react';
import awsIcon from '../../assets/aws_icon.jpeg';

const tracks = [
  ['01', 'TECHNICAL', 'Web · App · Game · AI / ML', Code2],
  ['02', 'EVENT IDEATION AND PLANNING', 'Concepts · Structure · Timelines · Engagement', Lightbulb],
  ['03', 'LOGISTICS AND PARTICIPANT MANAGEMENT', 'Venue · Equipment · Registration · Seating', ClipboardList],
  ['04', 'OPERATIONS & EXECUTION', 'Live delivery · Volunteers · Guests · Crowd', RadioTower],
];
const stages = [['01','PROFILE'],['02','SUBDOMAIN'],['03','ROUND 0'],['04','ROUND 1'],['05','INTERVIEW'],['06','FINAL RESULT']];

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="shell flex h-20 items-center justify-between border-b border-[var(--border)]">
        <div className="flex items-center gap-3 font-mono text-xs tracking-[.18em]">
          <img
            src={awsIcon}
            alt="AWS Logo"
            className="h-10 w-10 rounded-md object-contain border border-[var(--border)] p-1 bg-black/40"
          />
          <span>AWS STUDENT BUILDER GROUP<br /><span style={{ color: 'var(--muted)' }}>VIT VELLORE</span></span>
        </div>
        <Link className="action !min-h-10 !px-5" to="/recruitment/login">
          Enter portal <ArrowRight size={14} />
        </Link>
      </header>

      <section className="shell grid min-h-[72vh] items-center gap-14 py-20 lg:grid-cols-[1.25fr_.75fr]">
        <div>
          <p className="eyebrow">RECRUITMENT_2026 / APPLICATIONS_OPEN</p>
          <h1 className="mt-7 text-5xl font-bold leading-[.95] tracking-[-.055em] sm:text-7xl lg:text-[88px]">
            LEARN.<br />BUILD.<br /><span style={{ color: 'var(--accent)' }}>DEPLOY.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8" style={{ color: 'var(--muted)' }}>
            Join the builders and organizers who create the technology, planning, logistics, and live execution behind every AWS-SBG experience.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link className="action" to="/recruitment/login">Start application <ArrowRight size={16} /></Link>
            <a className="action-secondary" href="#process">View protocol</a>
          </div>
        </div>
        <div className="technical-panel p-7">
          <CloudCog size={32} style={{ color: 'var(--accent)' }} />
          <p className="eyebrow mt-10">SYSTEM_STATUS</p>
          <dl className="mt-4 divide-y font-mono text-xs" style={{ borderColor: 'var(--border)' }}>
            {[['APPLICATIONS','OPEN'],['COST TO APPLY','₹0 / FREE'],['DOMAINS','04 ACTIVE']].map(([k,v]) => (
              <div key={k} className="flex justify-between py-4">
                <dt style={{ color: 'var(--muted)' }}>{k}</dt>
                <dd style={{ color: k === 'APPLICATIONS' ? 'var(--accent)' : 'var(--text)' }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="process" className="border-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="shell py-20">
          <p className="eyebrow">SELECTION_PROTOCOL</p>
          <h2 className="mt-4 text-3xl sm:text-4xl" style={{ color: 'var(--text)' }}>One path. Every state visible.</h2>
          <div className="mt-10 grid gap-px sm:grid-cols-3 lg:grid-cols-6" style={{ background: 'var(--border)' }}>
            {stages.map(([n, s]) => (
              <div key={n} className="p-5" style={{ background: 'var(--bg)' }}>
                <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{n}</span>
                <p className="mt-8 font-mono text-xs tracking-[.12em]">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-20">
        <p className="eyebrow">RECRUITMENT_DOMAINS</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {tracks.map(([n, name, desc, Icon]) => (
            <article key={n} className="technical-panel group p-6 transition hover:border-[var(--accent)]">
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{n} /</span>
                <Icon style={{ color: 'var(--dim)' }} />
              </div>
              <h3 className="mt-12 text-xl" style={{ color: 'var(--text)' }}>{name}</h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="shell flex flex-col justify-between gap-3 py-8 font-mono text-[10px] tracking-[.14em] sm:flex-row" style={{ color: 'var(--dim)' }}>
          <span>© 2026 AWS STUDENT BUILDER GROUP @ VIT</span>
          <span>ARCHITECTED FOR THE CLOUD</span>
        </div>
      </footer>
    </main>
  );
}
