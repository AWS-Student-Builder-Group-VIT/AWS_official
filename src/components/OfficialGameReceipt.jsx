import React from 'react';

export default function OfficialGameReceipt({
  gameTitle,
  receipt = null,
  submitting = false,
  onRetry,
  onDashboard,
  onPractice,
}) {
  const confirmed = receipt?.confirmed === true;
  return (
    <main className="min-h-screen bg-[#080b11] text-white grid place-items-center p-5 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,153,0,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,153,0,.12) 1px,transparent 1px)', backgroundSize: '42px 42px' }} />
      <section className="relative w-full max-w-2xl border border-[#ff9900]/40 bg-[#10151f] rounded-3xl p-7 sm:p-10 shadow-[0_0_60px_rgba(255,153,0,.12)] text-center">
        <p className="text-[#ff9900] text-xs uppercase tracking-[0.28em] font-bold mb-3">Official Game Result</p>
        <h1 className="text-3xl sm:text-5xl font-bold uppercase tracking-wide m-0">{gameTitle}</h1>
        {submitting && !receipt ? (
          <div className="py-12">
            <div className="mx-auto mb-5 h-10 w-10 rounded-full border-4 border-[#ff9900]/20 border-t-[#ff9900] animate-spin" />
            <p className="text-white/70 uppercase tracking-widest">Submitting score to Neon…</p>
          </div>
        ) : confirmed ? (
          <>
            <div className="my-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
              <strong className="block text-4xl sm:text-6xl text-emerald-400">+{receipt.points}</strong>
              <span className="block mt-2 text-sm uppercase tracking-widest text-emerald-100">{receipt.points === 1 ? 'point added' : 'points added'} to your team score</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <div className="rounded-xl bg-white/5 p-4"><small className="block text-white/50 uppercase tracking-widest">Team Balance</small><b className="text-2xl text-[#ff9900]">{receipt.balance} pts</b></div>
              <div className="rounded-xl bg-white/5 p-4"><small className="block text-white/50 uppercase tracking-widest">Official Games</small><b className="text-2xl">{receipt.usedAttempts ?? '—'} used</b></div>
              <div className="rounded-xl bg-white/5 p-4"><small className="block text-white/50 uppercase tracking-widest">Remaining</small><b className="text-2xl">{receipt.remainingAttempts ?? '—'}</b></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onClick={onDashboard} className="rounded-xl bg-[#ff9900] text-black px-5 py-4 font-bold uppercase tracking-widest cursor-pointer">Back to Dashboard</button>
              <button type="button" onClick={onPractice} className="rounded-xl border border-white/20 bg-white/5 px-5 py-4 font-bold uppercase tracking-widest cursor-pointer">Play Again — Practice</button>
            </div>
          </>
        ) : (
          <>
            <div className="my-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
              <strong className="block text-2xl text-red-300">Score submission is waiting</strong>
              <span className="block mt-3 text-sm text-red-100/80">{receipt?.error || 'The scoring server could not confirm this result.'}</span>
            </div>
            <p className="text-sm text-white/60 mb-6">Your result remains queued in this browser. Practice unlocks only after Neon confirms the official score.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" disabled={submitting} onClick={onRetry} className="rounded-xl bg-[#ff9900] disabled:opacity-50 text-black px-5 py-4 font-bold uppercase tracking-widest cursor-pointer">{submitting ? 'Submitting…' : 'Retry Submission'}</button>
              <button type="button" onClick={onDashboard} className="rounded-xl border border-white/20 bg-white/5 px-5 py-4 font-bold uppercase tracking-widest cursor-pointer">Back to Dashboard</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
