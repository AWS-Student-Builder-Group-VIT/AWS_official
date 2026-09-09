import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { eventRequest } from '../../../utils/eventRewards';

export default function TeamInvitations({ onJoined }) {
  const [open,setOpen]=useState(false);
  const [invitations,setInvitations]=useState(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  async function signIn(response) {
    setBusy(true);
    try {
      const session=await eventRequest('mystery-box/session',{method:'POST',body:{credential:response.credential}});
      sessionStorage.setItem('mystery-box-hackathon-token',session.token);
      sessionStorage.setItem('mystery-box-hackathon-my-email',session.user.email);
      setInvitations((await eventRequest('mystery-box/invitations')).invitations);
    } catch(error){setMessage(error.message);}finally{setBusy(false);}
  }
  async function accept(invitation) {
    setBusy(true);
    try {
      await eventRequest(`mystery-box/invitations/${invitation.id}/accept`,{method:'POST',body:{}});
      const team=await eventRequest(`mystery-box/teams/${invitation.code}`);
      localStorage.setItem('mystery-box-hackathon-team',JSON.stringify(team));
      onJoined();
    } catch(error){setMessage(error.message);}finally{setBusy(false);}
  }
  return <div className="text-center p-4">
    <button className="text-orange-400 underline" onClick={()=>setOpen(!open)}>Have an organizer invitation?</button>
    {open&&<div className="rounded-xl border border-orange-400/30 p-5 max-w-lg mx-auto mt-3 bg-[#111319]">
      <p className="mb-3">Verify your invited Google email to accept.</p>
      <GoogleLogin onSuccess={signIn} onError={()=>setMessage('Google sign-in failed')}/>
      {invitations?.length===0&&<p className="mt-3">No pending invitations for this email.</p>}
      {invitations?.map(i=><button key={i.id} disabled={busy} className="block bg-orange-400 text-black p-3 rounded my-3 w-full" onClick={()=>accept(i)}>Accept invitation to {i.teamName}</button>)}
      <p role="status">{busy?'Loading…':message}</p>
    </div>}
  </div>;
}
