import { randomInt, randomUUID } from 'node:crypto';
import { appendLedger, findAuthorizedTeam, listHackathonMembers, normalizeTeamCode, transact, validateAttemptResetReason } from './hackathonScoring.js';
import { createTeamChallengeSnapshot, getChallengeById } from './challengeCatalog.js';
import { formatHackathonTeam } from './hackathonTeam.js';

export function chooseWheelReward(value) {
  if (!Number.isInteger(value) || value < 0 || value >= 10000) throw new Error('Invalid random draw');
  if (value < 9000) return { outcome: 'better-luck', segmentIndex: value % 5, points: 0 };
  if (value < 9500) return { outcome: 'points', segmentIndex: 5, points: 50 };
  return { outcome: 'free-change', segmentIndex: 6, points: 0 };
}

function reject(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function requestId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) reject('A valid request ID is required');
  return value;
}
export function validateSpinUsage(value, completed) {
  if (!Number.isInteger(value) || value < completed || value > 5) reject(`Used spins must be between ${completed} and 5`);
  return value;
}
async function audit(client, team, actor, action, reason, before, after) {
  await client.query(`INSERT INTO hackathon_activity_logs(team_code,team_name,event_type,message,details) VALUES($1,$2,$3,$4,$5)`,
    [team.code || 'SYSTEM', team.team_name || 'Event', action, reason, JSON.stringify({ actor, before, after })]);
}
async function chaosState(client, lock = '') {
  const result = await client.query(`SELECT value FROM hackathon_event_settings WHERE key='chaos_enabled' ${lock}`);
  return result.rows[0]?.value === true;
}

export async function initializeEventRewards(pool) {
  await pool.query(`
    ALTER TABLE hackathon_teams ADD COLUMN IF NOT EXISTS spins_used INTEGER NOT NULL DEFAULT 0 CHECK(spins_used BETWEEN 0 AND 5);
    ALTER TABLE hackathon_teams ADD COLUMN IF NOT EXISTS free_change_cards INTEGER NOT NULL DEFAULT 0 CHECK(free_change_cards >= 0);
    ALTER TABLE hackathon_teams ADD COLUMN IF NOT EXISTS chaos_version INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE hackathon_teams ADD COLUMN IF NOT EXISTS primary_awarded BOOLEAN NOT NULL DEFAULT FALSE;
    UPDATE hackathon_teams SET primary_awarded=TRUE WHERE is_opened=TRUE;
    CREATE TABLE IF NOT EXISTS team_wheel_spins (
      id UUID PRIMARY KEY, team_id INTEGER NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
      request_id UUID NOT NULL, actor TEXT NOT NULL, outcome TEXT NOT NULL,
      segment_index INTEGER NOT NULL, points INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(team_id, request_id));
    CREATE TABLE IF NOT EXISTS team_card_redemptions (
      team_id INTEGER NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
      request_id UUID NOT NULL, topic_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(team_id, request_id));
    INSERT INTO hackathon_event_settings(key,value)
      SELECT 'chaos_enabled', to_jsonb(COALESCE(value <> 'null'::jsonb,FALSE))
      FROM hackathon_event_settings WHERE key='chaos_mode_revealed_at'
      ON CONFLICT(key) DO NOTHING;
    INSERT INTO hackathon_event_settings(key,value) VALUES('chaos_version','1'::jsonb) ON CONFLICT(key) DO NOTHING;
    UPDATE hackathon_teams SET chaos_version=1 WHERE is_chaos_opened=TRUE AND chaos_version=0;
  `);
}

export async function spinWheel(pool, { code, user, id, draw = () => randomInt(10000) }) {
  requestId(id);
  return transact(pool, async client => {
    const team = await findAuthorizedTeam(client, code, user, { lock: true });
    const previous = await client.query('SELECT * FROM team_wheel_spins WHERE team_id=$1 AND request_id=$2', [team.id,id]);
    let spin = previous.rows[0];
    if (!spin) {
      if (team.spins_used >= 5) reject('Your team has used all five spins', 409);
      const reward = chooseWheelReward(draw());
      const spinId = randomUUID();
      await appendLedger(client, { team, sourceType: 'wheel', sourceRef: spinId, delta: reward.points,
        reason: `Wheel: ${reward.outcome}`, actor: user, metadata: reward });
      await client.query('UPDATE hackathon_teams SET spins_used=spins_used+1, free_change_cards=free_change_cards+$1, updated_at=NOW() WHERE id=$2', [reward.outcome === 'free-change' ? 1 : 0, team.id]);
      team.spins_used += 1;
      team.free_change_cards += reward.outcome === 'free-change' ? 1 : 0;
      const inserted = await client.query(`INSERT INTO team_wheel_spins(id,team_id,request_id,actor,outcome,segment_index,points) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [spinId,team.id,id,user.sub,reward.outcome,reward.segmentIndex,reward.points]);
      spin = inserted.rows[0];
      await audit(client,team,user.sub,'WHEEL_SPIN',`Wheel: ${reward.outcome}`,null,spin);
    }
    return { spin, duplicate: Boolean(previous.rows.length), balance: Number(team.points), spinsUsed: team.spins_used,
      remainingSpins: 5-team.spins_used, freeChangeCards: team.free_change_cards };
  });
}

export async function setChaosMode(pool, { enabled, reason, actor }) {
  if (typeof enabled !== 'boolean') reject('Enabled must be a boolean');
  validateAttemptResetReason(reason);
  return transact(pool, async client => {
    const current = await chaosState(client,'FOR UPDATE');
    if (current === enabled) return { enabled, unchanged: true };
    await client.query("UPDATE hackathon_event_settings SET value=$1::jsonb,updated_at=NOW() WHERE key='chaos_enabled'", [JSON.stringify(enabled)]);
    if (enabled) {
      await client.query("UPDATE hackathon_event_settings SET value=to_jsonb((value::text)::integer+1),updated_at=NOW() WHERE key='chaos_version'");
      await client.query("UPDATE hackathon_event_settings SET value=to_jsonb(NOW()::text) WHERE key='chaos_mode_revealed_at' AND value='null'::jsonb");
    }
    const result = await client.query(`UPDATE hackathon_teams SET is_chaos_opened=$1,
      chaos_version=CASE WHEN $1 THEN (SELECT (value::text)::integer FROM hackathon_event_settings WHERE key='chaos_version') ELSE chaos_version END,
      updated_at=NOW() RETURNING code,team_name`, [enabled]);
    for (const team of result.rows) await audit(client,team,actor,'CHAOS_MODE',reason,{ enabled: current },{ enabled });
    return { enabled, updatedCount: result.rows.length };
  });
}

export function registerEventRewardRoutes(app, { pool, hackathonAuth, adminMiddleware }) {
  const route = fn => async (req,res) => {
    try { res.json(await fn(req)); }
    catch (error) { if (!error.status) console.error('Event operation failed:',error); res.status(error.status || (error.message.includes('required') ? 400 : 500)).json({ error: error.status || error.message.includes('required') ? error.message : 'Event operation failed' }); }
  };
  app.post('/api/mystery-box/teams/:code/spins', hackathonAuth, route(req => spinWheel(pool,{ code:req.params.code,user:req.hackathonUser,id:req.body.requestId })));
  app.get('/api/mystery-box/teams/:code/spins', hackathonAuth, route(req => transact(pool,async client => {
    const team=await findAuthorizedTeam(client,req.params.code,req.hackathonUser);
    const history=await client.query('SELECT * FROM team_wheel_spins WHERE team_id=$1 ORDER BY created_at DESC',[team.id]);
    return { spins:history.rows,spinsUsed:team.spins_used,remainingSpins:5-team.spins_used,freeChangeCards:team.free_change_cards };
  })));
  app.post('/api/admin/mystery-box/chaos-mode',adminMiddleware,route(req => setChaosMode(pool,{...req.body,actor:`admin:${req.admin.role}`})));
  app.post('/api/admin/mystery-box/chaos/reveal',adminMiddleware,route(req => setChaosMode(pool,{...req.body,enabled:true,actor:`admin:${req.admin.role}`})));
  app.post('/api/admin/mystery-box/games-mode',adminMiddleware,route(req=>transact(pool,async client=>{
    validateAttemptResetReason(req.body.reason);
    if(typeof req.body.enabled !== 'boolean') reject('Enabled must be a boolean');
    const previous=await client.query("SELECT value FROM hackathon_event_settings WHERE key='games_enabled' FOR UPDATE");
    await client.query("UPDATE hackathon_event_settings SET value=$1::jsonb,updated_at=NOW() WHERE key='games_enabled'",[JSON.stringify(req.body.enabled)]);
    await audit(client,{},`admin:${req.admin.role}`,'GAME_MODE',req.body.reason,{enabled:previous.rows[0]?.value},{enabled:req.body.enabled});
    return {enabled:req.body.enabled};
  })));

  app.post('/api/mystery-box/teams/:code/free-topic-swap',hackathonAuth,route(req => transact(pool,async client => {
    const id=requestId(req.body.requestId);
    const enabled=await chaosState(client,'FOR SHARE');
    const team=await findAuthorizedTeam(client,req.params.code,req.hackathonUser,{lock:true});
    const previous=await client.query('SELECT topic_id FROM team_card_redemptions WHERE team_id=$1 AND request_id=$2',[team.id,id]);
    if (!previous.rows.length) {
      if (enabled) reject('Topic changes are locked while Chaos is enabled',409);
      if (!team.is_opened || team.free_change_cards < 1) reject('Reveal your challenge and obtain a free change card first',409);
      const target=getChallengeById(req.body.topicId);
      if (!target || target.id === team.mystery_question?.id) reject('Choose a different catalog problem');
      const snapshot=createTeamChallengeSnapshot(target);
      await appendLedger(client,{team,sourceType:'topic-swap',sourceRef:`card:${id}`,delta:0,reason:'Free problem change card redeemed',actor:req.hackathonUser,metadata:{fromTopicId:team.mystery_question.id,toTopicId:target.id,cardUsed:1}});
      await client.query('UPDATE hackathon_teams SET mystery_question=$1,chaos_event=$2,free_change_cards=free_change_cards-1,is_chaos_resolved=FALSE,updated_at=NOW() WHERE id=$3',[JSON.stringify(snapshot.challenge),JSON.stringify(snapshot.chaosEvent),team.id]);
      await client.query('INSERT INTO team_card_redemptions(team_id,request_id,topic_id) VALUES($1,$2,$3)',[team.id,id,target.id]);
      await audit(client,team,req.hackathonUser.sub,'FREE_TOPIC_SWAP','Free change card redeemed',team.mystery_question,snapshot.challenge);
      team.mystery_question=snapshot.challenge; team.free_change_cards-=1;
    }
    return {topic:team.mystery_question,balance:Number(team.points),cost:0,hasChangedQuestion:team.has_changed_question,freeChangeCards:team.free_change_cards};
  })));

  const editTeam = route(req => transact(pool,async client => {
    validateAttemptResetReason(req.body.reason);
    await chaosState(client,'FOR SHARE');
    const found=await client.query('SELECT * FROM hackathon_teams WHERE code=$1 FOR UPDATE',[normalizeTeamCode(req.params.code)]);
    if (!found.rows.length) reject('Team not found',404);
    const team=found.rows[0]; const before=structuredClone(team); const input=req.body;
    if(input.expectedUpdatedAt !== undefined && Number(input.expectedUpdatedAt) !== new Date(team.updated_at).getTime()) reject('This team changed while you were editing. Close and reopen the editor to review the latest values.',409);
    if (input.teamName !== undefined) { if(typeof input.teamName !== 'string' || !input.teamName.trim() || input.teamName.length>128) reject('Invalid team name'); team.team_name=input.teamName.trim(); }
    for (const [key,column] of [['isOpened','is_opened'],['isChaosResolved','is_chaos_resolved'],['hasChangedQuestion','has_changed_question']]) {
      if (input[key] !== undefined) { if(typeof input[key] !== 'boolean') reject(`Invalid ${key}`); team[column]=input[key]; }
    }
    if (input.freeChangeCards !== undefined) { if(!Number.isInteger(input.freeChangeCards)||input.freeChangeCards<0||input.freeChangeCards>100) reject('Cards must be between 0 and 100'); team.free_change_cards=input.freeChangeCards; }
    if (input.spinsUsed !== undefined) { const count=await client.query('SELECT COUNT(*)::integer AS count FROM team_wheel_spins WHERE team_id=$1',[team.id]); team.spins_used=validateSpinUsage(input.spinsUsed,count.rows[0].count); }
    if (input.maxGameAttempts !== undefined) { if(!Number.isInteger(input.maxGameAttempts)||input.maxGameAttempts<0||input.maxGameAttempts>12) reject('Game limit must be 0–12'); team.max_game_attempts=input.maxGameAttempts; }
    if (input.ownedItems !== undefined) { if(!Array.isArray(input.ownedItems)||input.ownedItems.some(x=>typeof x!=='string'||x.length>100)||input.ownedItems.length>20) reject('Invalid inventory'); team.owned_items=[...new Set(input.ownedItems)]; }
    if (input.challengeId !== undefined && input.challengeId !== team.mystery_question?.id) { const target=getChallengeById(input.challengeId); if(!target) reject('Unknown challenge'); const snapshot=createTeamChallengeSnapshot(target); team.mystery_question=snapshot.challenge; team.chaos_event=snapshot.chaosEvent; team.is_chaos_resolved=false; }
    if (input.points !== undefined && input.points !== Number(team.points)) {
      if(!Number.isInteger(input.points)||input.points<0||Math.abs(input.points-Number(team.points))>10000) reject('Invalid point balance');
      await appendLedger(client,{team,sourceType:'admin',sourceRef:randomUUID(),delta:input.points-Number(team.points),reason:input.reason,actor:{sub:`admin:${req.admin.role}`}});
    }
    if (input.removeEmail !== undefined) {
      const current=await listHackathonMembers(client,team.id);
      const removed=current.find(m=>m.email===input.removeEmail);
      if(!removed) reject('Member not found',404);
      if(removed.isLeader) reject('Transfer leadership before removing the leader',409);
      input.members=current.filter(m=>m.email!==input.removeEmail).map(m=>({...m,regNo:m.regNo||''}));
    }
    if (input.members !== undefined) {
      const existing=await listHackathonMembers(client,team.id);
      if(!Array.isArray(input.members)||!input.members.length||input.members.filter(m=>m.isLeader===true).length!==1) reject('Exactly one team leader is required');
      if(new Set(input.members.map(m=>m.email)).size!==input.members.length) reject('Duplicate members');
      for(const member of input.members) {
        if(!existing.some(m=>m.email===member.email) || typeof member.isLeader!=='boolean' || typeof member.regNo!=='string'||member.regNo.length>64) reject('New members must join using the team code');
      }
      for(const member of existing) {
        const next=input.members.find(m=>m.email===member.email);
        if(!next) await client.query('DELETE FROM hackathon_team_members WHERE team_id=$1 AND email=$2',[team.id,member.email]);
        else await client.query('UPDATE hackathon_team_members SET reg_no=$1,is_leader=$2 WHERE team_id=$3 AND email=$4',[next.regNo,next.isLeader,team.id,member.email]);
      }
    }
    const members=await listHackathonMembers(client,team.id);
    await client.query(`UPDATE hackathon_teams SET team_name=$1,is_opened=$2,is_chaos_resolved=$3,has_changed_question=$4,
      free_change_cards=$5,spins_used=$6,max_game_attempts=$7,owned_items=$8,mystery_question=$9,chaos_event=$10,members=$11,updated_at=NOW() WHERE id=$12`,
      [team.team_name,team.is_opened,team.is_chaos_resolved,team.has_changed_question,team.free_change_cards,team.spins_used,team.max_game_attempts,JSON.stringify(team.owned_items),JSON.stringify(team.mystery_question),JSON.stringify(team.chaos_event),JSON.stringify(members),team.id]);
    await audit(client,team,`admin:${req.admin.role}`,'ADMIN_TEAM_EDIT',input.reason,before,{...team,members});
    return {success:true,code:team.code,maxAttempts:team.max_game_attempts,team:formatHackathonTeam(team,members)};
  }));
  app.patch('/api/admin/mystery-box/teams/:code',adminMiddleware,editTeam);
  app.post('/api/admin/mystery-box/teams/reassign',adminMiddleware,(req,res)=>{
    req.params.code=req.body.code;
    req.body={challengeId:req.body.challengeId,...(req.body.resetSwapUsed?{hasChangedQuestion:false}:{}),reason:req.body.reason};
    return editTeam(req,res);
  });
  app.post('/api/admin/mystery-box/teams/:code/games-limit',adminMiddleware,(req,res)=>{
    req.body={maxGameAttempts:req.body.maxAttempts,reason:req.body.reason}; return editTeam(req,res);
  });
  app.post('/api/admin/mystery-box/teams/:code/chaos/resolve',adminMiddleware,(req,res)=>{
    req.body={isChaosResolved:true,reason:req.body.reason}; return editTeam(req,res);
  });
  app.post('/api/admin/mystery-box/teams/:code/members/remove',adminMiddleware,(req,res)=>{
    req.body={removeEmail:req.body.email,reason:req.body.reason}; return editTeam(req,res);
  });
  app.delete('/api/admin/mystery-box/teams/:code',adminMiddleware,route(req=>transact(pool,async client=>{
    validateAttemptResetReason(req.body?.reason);
    const found=await client.query('SELECT * FROM hackathon_teams WHERE code=$1 FOR UPDATE',[normalizeTeamCode(req.params.code)]);
    if(!found.rows.length) reject('Team not found',404);
    await audit(client,found.rows[0],`admin:${req.admin.role}`,'TEAM_DELETED',req.body.reason,found.rows[0],null);
    await client.query('DELETE FROM hackathon_teams WHERE id=$1',[found.rows[0].id]);
    return {success:true};
  })));
}
