import { Link } from 'react-router-dom';
import { games } from './gamesRegistry';

export default function GamesPage() {
  return (
    <main className="min-h-screen bg-[#0A0C10] px-5 py-10 text-[#f1dfd1] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[#a38d7a] transition-colors hover:text-[#ff9900]">
          ← Back to AWS Student Builder Group
        </Link>
        <div className="mt-12 border-l-2 border-[#ff9900] pl-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#04beff]">Hackathon game lab</p>
          <h1 className="mt-3 font-mono text-4xl font-bold uppercase tracking-tight sm:text-6xl">Test the games</h1>
          <p className="mt-4 max-w-2xl text-[#a38d7a]">Choose a game and share this page with testers. Every Play button opens the game inside this website.</p>
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Available games">
          {games.map((game, index) => (
            <article key={game.slug} className="group flex min-h-56 flex-col border border-[#554434] bg-[#17130f] p-5 transition-colors hover:border-[#ff9900]">
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-xs text-[#ff9900]">{String(index + 1).padStart(2, '0')}</span>
                <span className="border border-[#04beff]/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#04beff]">{game.status}</span>
              </div>
              <h2 className="mt-8 font-mono text-xl font-bold uppercase text-[#f1dfd1]">{game.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#a38d7a]">{game.description}</p>
              <Link to={game.path} className="mt-6 inline-flex w-fit items-center gap-3 bg-[#ff9900] px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#2b1600] transition-colors group-hover:bg-[#ffc082]">
                Play game <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
