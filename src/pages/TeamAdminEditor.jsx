import { useState } from 'react';
import { eventRequest } from '../utils/eventRewards';

export default function TeamAdminEditor({ team, token, challenges, onClose, onSaved }) {
  const [form,setForm]=useState(()=>({teamName:team.teamName,points:team.points,freeChangeCards:team.freeChangeCards||0,spinsUsed:team.spinsUsed||0,maxGameAttempts:team.maxGameAttempts,isOpened:team.isOpened,isChaosResolved:team.isChaosResolved,hasChangedQuestion:team.hasChangedQuestion,challengeId:team.mysteryQuestion.id,ownedItems:team.ownedItems.join('\n'),members:team.members.map(m=>({...m,regNo:m.regNo||''})),reason:''}));
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [resetId,setResetId]=useState('');
  const [initialUpdatedAt]=useState(team.updatedAt);
  const update=(key,value)=>setForm(current=>({...current,[key]:value}));
  async function run(action, close=false) {
    if(form.reason.trim().length<5){setMessage('Enter a reason of at least five characters.');return;}
    setBusy(true);setMessage('');
    try { await action(); onSaved(); setMessage('Saved successfully.'); if(close)onClose(); }
    catch(error){setMessage(error.message);}finally{setBusy(false);}
  }
  const save=()=>run(()=>eventRequest(`admin/mystery-box/teams/${team.code}`,{adminToken:token,method:'PATCH',body:{...form,expectedUpdatedAt:initialUpdatedAt,ownedItems:form.ownedItems.split('\n').map(s=>s.trim()).filter(Boolean)}}),true);
  const inputClass='w-full bg-black/40 border border-white/20 rounded p-2 text-white';
  return <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-label="Edit team" className="bg-[#101319] text-white border border-orange-400/50 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto">
    <h2 className="text-orange-400 text-xl">Manage {team.teamName} · {team.code}</h2>
    <p className="text-xs my-2">Current balance: {team.points} · Spins used: {team.spinsUsed}/5 · Free cards: {team.freeChangeCards}. Saved edits require a reason.</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
      <label>Team name<input className={inputClass} value={form.teamName} onChange={e=>update('teamName',e.target.value)}/></label>
      {Object.entries({points:'Point balance',freeChangeCards:'Free cards',spinsUsed:'Spins used (0–5)',maxGameAttempts:'Official game limit (0–12)'}).map(([key,label])=><label key={key}>{label}<input className={inputClass} type="number" min="0" value={form[key]} onChange={e=>update(key,Number(e.target.value))}/></label>)}
      <label>Assigned problem<select className={inputClass} value={form.challengeId} onChange={e=>update('challengeId',e.target.value)}>{challenges.map(c=><option key={c.id} value={c.id}>{c.track} — {c.title}</option>)}</select></label>
      <div>Primary box: <strong>{form.isOpened ? 'Revealed by team' : 'Sealed'}</strong></div>
      {Object.entries({isChaosResolved:'Chaos resolved',hasChangedQuestion:'Paid topic swap used'}).map(([key,label])=><label key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={e=>update(key,e.target.checked)}/> {label}</label>)}
    </div>
    <label>Owned advantages (one per line)<textarea className={inputClass} value={form.ownedItems} onChange={e=>update('ownedItems',e.target.value)}/></label>
    <h3 className="text-orange-400 my-3">Members and leader</h3>
    {form.members.map((m,index)=><div key={m.email} className="flex flex-wrap gap-2 items-center border-b border-white/10 py-3">
      <span className="text-xs flex-1">{m.email}</span><input aria-label={`Registration number for ${m.email}`} className="bg-black/40 p-2 w-32" value={m.regNo} onChange={e=>update('members',form.members.map((v,i)=>i===index?{...v,regNo:e.target.value}:v))}/>
      <label><input type="radio" name="leader" checked={m.isLeader} onChange={()=>update('members',form.members.map((v,i)=>({...v,isLeader:i===index})))}/> Leader</label>
      <button disabled={m.isLeader} onClick={()=>update('members',form.members.filter((_,i)=>i!==index))} className="text-red-300 disabled:opacity-30">Remove</button>
    </div>)}
    <p className="text-xs mt-2">Transfer leadership before removing the leader. New members join from the HackQuest landing page using the team code.</p>
    <h3 className="text-orange-400 my-3">Official attempts</h3>
    <select aria-label="Attempt to reset" className={inputClass} value={resetId} onChange={e=>setResetId(e.target.value)}><option value="">Select an attempt to void</option>{team.gameAttempts.filter(a=>!a.voidedAt).map(a=><option key={a.attemptId} value={a.gameSlug}>{a.gameSlug} — {a.status} — {a.points} pts</option>)}</select>
    <button disabled={busy||!resetId} className="text-red-300 my-2" onClick={()=>run(()=>eventRequest(`admin/mystery-box/teams/${team.code}/games/${resetId}/reset`,{adminToken:token,method:'POST',body:{reason:form.reason}}))}>Void attempt and reverse its points</button>
    <details className="my-3"><summary>Spin and point history</summary>{team.spinHistory?.map(s=><p key={s.id}>{new Date(s.created_at).toLocaleString()} · {s.outcome}</p>)}{team.pointLedger?.map(l=><p key={`${l.sourceType}:${l.sourceRef}`}>{l.reason} · {l.delta} pts</p>)}</details>
    <label>Audit reason<textarea className={inputClass} value={form.reason} onChange={e=>update('reason',e.target.value)} minLength={5}/></label>
    <p role="status" className="text-orange-300 my-2">{message}</p>
    <div className="flex gap-3"><button disabled={busy} onClick={onClose} className="p-3 border rounded">Close</button><button disabled={busy||form.reason.trim().length<5} onClick={save} className="bg-orange-400 text-black rounded p-3 disabled:opacity-40">{busy?'Saving…':'Save team changes'}</button></div>
  </section></div>;
}
