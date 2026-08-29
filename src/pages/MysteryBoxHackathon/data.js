/* ═══════════════════════════════════════════════════════════
   MYSTERY BOX HACKATHON — Static Data
   ═══════════════════════════════════════════════════════════ */

/* ── Wheel Data ── */
export const WHEEL_SEGMENTS = [
  { label: 'Better Luck', color: '#2a1800', stroke: '#FF9900' },
  { label: 'Better Luck', color: '#1a0020', stroke: '#7C4DFF' },
  { label: 'Better Luck', color: '#001a2a', stroke: '#00A8FF' },
  { label: 'Better Luck', color: '#2a1800', stroke: '#FF9900' },
  { label: 'Better Luck', color: '#1a0020', stroke: '#7C4DFF' },
  { label: 'Golden Pass', color: '#1a1000', stroke: '#FFD700' },
  { label: 'Wildcard', color: '#0f0025', stroke: '#b24dff' },
];

/* ── How It Works Steps ── */
export const STEPS = [
  { num: 1, label: 'Team Registration', color: 'orange' },
  { num: 2, label: 'Topic Reveal', color: 'blue' },
  { num: 3, label: 'Build From Scratch', color: 'purple' },
  { num: 4, label: 'Earn Points', color: 'orange' },
  { num: 5, label: 'Unlock Advantages', color: 'blue' },
  { num: 6, label: 'Face Chaos Events', color: 'purple' },
  { num: 7, label: 'Final Pitch', color: 'orange' },
];

/* ── Rules ── */
export const RULES = [
  { title: 'Topics Assigned On The Spot', desc: 'Zero preparation possible. Your problem statement is revealed only at kickoff. Pure skill, no shortcuts.' },
  { title: 'No Pre-Built Projects', desc: 'Everything is built during the event. Bringing existing code will get your team disqualified.' },
  { title: 'Real-Time Innovation', desc: 'Ideas born and executed live. Judges observe the build process, not just the outcome.' },
  { title: 'Build Everything During The Event', desc: 'Architecture, design, code, deployment — all within the window. Clock is always ticking.' },
];

/* ── Points Sources ── */
export const POINTS = [
  { icon: '📝', val: '+50', name: 'AWS Quiz', pct: 70, color: '#FF9900' },
  { icon: '🧠', val: '+40', name: 'Cloud Puzzle', pct: 55, color: '#00A8FF' },
  { icon: '🪲', val: '+60', name: 'Debug Challenge', pct: 40, color: '#7C4DFF' },
  { icon: '💰', val: '+45', name: 'Treasure Hunt', pct: 30, color: '#00c864' },
  { icon: '➕', val: '+30', name: 'Bonus Tasks', pct: 60, color: '#ffd700' },
  { icon: '⏱️', val: '+80', name: 'Fastest Solver', pct: 20, color: '#ff3264' },
];

/* ── Shop Items ── */
export const SHOP_ITEMS = [
  { price: '150 pts', title: 'Mentor Help', desc: '30 minutes with an expert mentor for technical guidance on your build.' },
  { price: '80 pts', title: 'Hint Card', desc: 'Unlock a targeted hint for your current problem from the organizers.' },
  { price: '100 pts', title: 'Technical Review', desc: 'Get a quick code review and feedback from a senior developer.' },
  { price: '120 pts', title: 'Extra Pitch Time', desc: 'Buy 3 additional minutes for your final presentation to the judges.' },
  { price: '200 pts', title: 'Second Chance Token', desc: 'Save your team from elimination. One-time use per team only.' },
  { price: '180 pts', title: 'Reveal Judging Criteria', desc: 'Peek at what judges are scoring most heavily before your pitch.' },
  { price: '250 pts', title: 'Recruit a Friend', desc: 'Add a temporary external collaborator to your team for 2 hours.' },
];

/* ── Mystery Box Rewards & Twists ── */
export const REWARDS = ['+100 Points', 'Mentor Assistance', 'Hint Card', 'Technical Support'];
export const TWISTS = ['Technology Restriction', 'Topic Modification', 'Additional Feature Req.', 'Surprise Client Request'];

/* ── Chaos Events ── */
export const CHAOS_EVENTS = [
  { title: 'Market Shift', desc: 'Your target user persona has changed completely. Rethink your value proposition.' },
  { title: 'Investor Pitch', desc: 'An investor arrives in 15 minutes. You must pitch your MVP immediately.' },
  { title: 'Security Alert', desc: 'A critical vulnerability has been found in your stack. Patch it now.' },
  { title: 'Budget Cut', desc: 'Your cloud budget has been slashed by 60%. Optimize your architecture.' },
  { title: 'Viral Growth', desc: 'Congrats — your app went viral. Now handle 100× the expected load.' },
  { title: 'Client Revision', desc: 'The client changed their mind. Major feature redesign required. Today.' },
];

/* ── Penalties ── */
export const PENALTIES = [
  { val: '−50 pts', name: 'Point Loss' },
  { val: '−1', name: 'Lose Hint' },
  { val: '+1', name: 'Extra Feature Required' },
  { val: '−2 min', name: 'Reduced Pitch Time' },
  { val: '×1', name: 'Surprise Judge Question' },
];

/* ── Finale Pills ── */
export const FINALE_PILLS = ['Mystery Boxes', 'Chaos Cards', 'Point Shop', 'Spin Wheel', 'Final Presentation'];
