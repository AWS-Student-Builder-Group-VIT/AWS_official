import { useEffect, useRef, useState } from 'react';
import { createSpinOutcome } from './spinWheelLogic';
import { eventRequest, pendingRequest } from '../../../utils/eventRewards';

const sectors = ['Better Luck', 'Better Luck', 'Better Luck', 'Better Luck', 'Better Luck', '+50 Points', 'Free Problem|Change Card'];
export default function SpinWheel({ team = { code: 'preview' }, isMember = false }) {
  const [busy, setBusy] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState(null);
  const timer = useRef(null);
  const mounted = useRef(true);
  const locked = useRef(false);
  const key = `aws-wheel-pending:${team.code}`;
  const [pending, setPending] = useState(() => Boolean(localStorage.getItem(key)));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; clearTimeout(timer.current); }; }, []);
  const used = receipt && receipt.previousUpdatedAt === team.updatedAt ? receipt.spinsUsed : team.spinsUsed || 0;

  async function spin() {
    if (locked.current || !isMember) return;
    locked.current = true; setBusy(true); setMessage('Confirming your spin…');
    try {
      const requestId = pendingRequest(key); setPending(true);
      const result = await eventRequest(`mystery-box/teams/${team.code}/spins`, { method: 'POST', body: { requestId } });
      if (!mounted.current) return;
      setRotation(createSpinOutcome({ segmentCount: 7, selectedIndex: result.spin.segment_index, currentRotation: rotation }).rotation);
      const finish = () => {
        localStorage.removeItem(key); setPending(false); setReceipt({...result,previousUpdatedAt:team.updatedAt});
        setMessage(result.spin.outcome === 'points' ? `+50 points added. Team balance: ${result.balance} pts.` : result.spin.outcome === 'free-change' ? `Free Problem Change Card won! Cards available: ${result.freeChangeCards}.` : 'Better luck next time!');
        setBusy(false); locked.current = false;
        window.dispatchEvent(new Event('aws-team-score:updated'));
      };
      timer.current = setTimeout(finish, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1650);
    } catch (error) {
      if (mounted.current) {
        const rejected=[400,403,409].includes(error.status);
        if(rejected){ localStorage.removeItem(key); setPending(false); }
        setMessage(rejected ? error.message : `${error.message}. Retry to recover the same spin.`); setBusy(false); locked.current = false;
      }
    }
  }
  return <div className="flex flex-col items-center gap-6 p-4">
    <p className="text-primary-container font-mono">Spins remaining: {5-used}/5</p>
    <div className="relative w-full max-w-[380px]">
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-4xl text-white" aria-hidden="true">▼</div>
      <svg viewBox="0 0 360 360" role="img" aria-label="Prize wheel: 90% better luck, 5% fifty points, 5% free problem change card" style={{ width: '100%', transform: `rotate(${rotation}deg)`, transition: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'transform 1.6s cubic-bezier(.17,.67,.12,.99)' }}>
        <circle cx="180" cy="180" r="174" fill="#090d14" stroke="#ff9900" strokeWidth="5" />
        {sectors.map((label,i) => {
          const start=(i*360/7-90)*Math.PI/180, end=((i+1)*360/7-90)*Math.PI/180, mid=(start+end)/2;
          const x=180+108*Math.cos(mid),y=180+108*Math.sin(mid);
          return <g key={i}>
            <path d={`M180 180 L${180+164*Math.cos(start)} ${180+164*Math.sin(start)} A164 164 0 0 1 ${180+164*Math.cos(end)} ${180+164*Math.sin(end)} Z`} fill={i===5?'#663600':i===6?'#272152':i%2?'#182536':'#101823'} stroke="#ffb84d" strokeWidth="2.5" />
            <text x={x} y={y} textAnchor="middle" fill={i<5?'#f4e6cf':'#ffffff'} fontSize="12" fontWeight="700">{label.split('|').map((line,j)=><tspan key={line} x={x} dy={j?16:0}>{line}</tspan>)}</text>
          </g>;
        })}
        <circle cx="180" cy="180" r="31" fill="#090d14" stroke="#ff9900" strokeWidth="3" />
        <text x="180" y="185" textAnchor="middle" fill="#ff9900" fontWeight="bold">SPIN</text>
      </svg>
    </div>
    <p className="text-xs text-center text-on-surface-variant">Better luck: 90% · +50 points: 5% · Free change card: 5%<br />Sector sizes are decorative; each spin uses these odds.</p>
    <button onClick={spin} disabled={busy || !isMember || (used>=5 && !pending)} className="bg-primary-container text-black font-bold px-8 py-3 rounded-lg disabled:opacity-40">{busy?'Spinning…':!isMember?'Team members only':pending?'Retry pending spin':used>=5?'All five spins used':'Spin the wheel'}</button>
    <p role="status" className="text-center text-primary-container min-h-6">{message}</p>
  </div>;
}
