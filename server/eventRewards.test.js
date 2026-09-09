import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { chooseWheelReward, initializeEventRewards, registerEventRewardRoutes, setChaosMode, spinWheel, validateSpinUsage } from './eventRewards.js';
import { listPublicChallenges, createTeamChallengeSnapshot, getChallengeById } from './challengeCatalog.js';
import { formatHackathonTeam } from './hackathonTeam.js';
import { registerHackathonScoringRoutes } from './hackathonScoring.js';
import { getSegmentAtPointer, createSpinOutcome } from '../src/pages/MysteryBoxHackathon/components/spinWheelLogic.js';

test('wheel has exactly 90/5/5 odds and every selected sector aligns with the pointer',()=>{
  const counts={'better-luck':0,points:0,'free-change':0};
  for(let draw=0;draw<10000;draw++) {
    const reward=chooseWheelReward(draw); counts[reward.outcome]++;
    const result=createSpinOutcome({segmentCount:7,selectedIndex:reward.segmentIndex});
    assert.equal(getSegmentAtPointer(result.rotation,7),reward.segmentIndex);
  }
  assert.deepEqual(counts,{'better-luck':9000,points:500,'free-change':500});
  assert.equal(chooseWheelReward(9000).points,50);
  assert.equal(chooseWheelReward(9500).outcome,'free-change');
  assert.throws(()=>chooseWheelReward(10000));
  assert.throws(()=>validateSpinUsage(2,3));
  assert.throws(()=>validateSpinUsage(6,3));
});

test('PostgreSQL reward, chaos and team administration transactions',async t=>{
  const db=new PGlite();
  await db.exec(`
    CREATE TABLE hackathon_teams(id SERIAL PRIMARY KEY,code TEXT UNIQUE,team_name TEXT,mystery_question JSONB,chaos_event JSONB,
      points INTEGER DEFAULT 100,is_opened BOOLEAN DEFAULT TRUE,is_chaos_opened BOOLEAN DEFAULT FALSE,is_chaos_resolved BOOLEAN DEFAULT FALSE,
      has_changed_question BOOLEAN DEFAULT FALSE,owned_items JSONB DEFAULT '[]',members JSONB DEFAULT '[]',max_game_attempts INTEGER DEFAULT 5,
      created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE hackathon_event_settings(key TEXT PRIMARY KEY,value JSONB,updated_at TIMESTAMPTZ DEFAULT NOW());
    INSERT INTO hackathon_event_settings(key,value) VALUES('chaos_mode_revealed_at','null'),('games_enabled','true');
    CREATE TABLE hackathon_team_members(id SERIAL PRIMARY KEY,team_id INTEGER REFERENCES hackathon_teams ON DELETE CASCADE,
      email TEXT,google_sub TEXT,reg_no TEXT,is_leader BOOLEAN,joined_at TIMESTAMPTZ DEFAULT NOW(),UNIQUE(team_id,email));
    CREATE TABLE team_point_ledger(id SERIAL PRIMARY KEY,team_id INTEGER REFERENCES hackathon_teams ON DELETE CASCADE,
      source_type TEXT,source_ref TEXT,delta INTEGER,balance_after INTEGER,reason TEXT,actor_google_sub TEXT,metadata JSONB,created_at TIMESTAMPTZ DEFAULT NOW(),UNIQUE(team_id,source_type,source_ref));
    CREATE TABLE hackathon_activity_logs(id SERIAL PRIMARY KEY,team_code TEXT,team_name TEXT,event_type TEXT,message TEXT,details JSONB,created_at TIMESTAMPTZ DEFAULT NOW());
  `);
  // PGlite has one connection; serialize transactions like a pool of size one.
  let tail=Promise.resolve();
  const query=(sql,args)=> args || !sql.includes(';') ? db.query(sql,args) : db.exec(sql).then(results=>results.at(-1));
  const pool={query,async connect(){const previous=tail;let release;tail=new Promise(r=>{release=r;});await previous;return {query,release};}};
  await initializeEventRewards(pool);
  const challengeIds=listPublicChallenges().slice(0,3).map(c=>c.id);
  const snapshot=createTeamChallengeSnapshot(getChallengeById(challengeIds[0]));
  for (const code of ['TEAM01','TEAM02']) {
    const team=await query('INSERT INTO hackathon_teams(code,team_name,mystery_question,chaos_event) VALUES($1,$1,$2,$3) RETURNING id',[code,JSON.stringify(snapshot.challenge),JSON.stringify(snapshot.chaosEvent)]);
    await query('INSERT INTO hackathon_team_members(team_id,email,google_sub,is_leader) VALUES($1,$2,$3,TRUE)',[team.rows[0].id,`${code}@test.local`,code]);
  }
  const user={sub:'TEAM01',email:'TEAM01@test.local'};
  const routes=new Map();
  const app=Object.fromEntries(['get','post','patch','delete'].map(method=>[method,(path,...handlers)=>{if(!routes.has(`${method}:${path}`))routes.set(`${method}:${path}`,handlers.at(-1));}]));
  const middleware=(_req,_res,next)=>next();
  registerEventRewardRoutes(app,{pool,hackathonAuth:middleware,adminMiddleware:middleware});
  registerHackathonScoringRoutes(app,{pool,hackathonAuth:middleware,adminMiddleware:middleware});
  async function request(method,path,body={},params={code:'TEAM01'},identity=user){
    let data;let status=200;
    await routes.get(`${method}:${path}`)({body,params,hackathonUser:identity,admin:{role:'admin'}},{json(value){data=value;return this;},status(value){status=value;return this;}});
    return {status,data};
  }
  const team=async(code='TEAM01')=>(await query('SELECT * FROM hackathon_teams WHERE code=$1',[code])).rows[0];
  const edit=(body)=>request('patch','/api/admin/mystery-box/teams/:code',{reason:'Test adjustment',...body});
  await t.test('leader authorization, repeated requests and exact point awards',async()=>{
    await assert.rejects(spinWheel(pool,{code:'TEAM02',user,id:randomUUID()}),{status:403});
    const id=randomUUID();
    const won=await spinWheel(pool,{code:'TEAM01',user,id,draw:()=>9000});
    assert.equal(won.balance,150);assert.equal(won.spinsUsed,1);
    const repeated=await spinWheel(pool,{code:'TEAM01',user,id,draw:()=>9500});
    assert.equal(repeated.spin.id,won.spin.id);assert.equal(repeated.balance,150);assert.equal(repeated.spinsUsed,1);
    assert.equal((await query("SELECT COUNT(*)::integer AS count FROM team_point_ledger WHERE source_type='wheel'")).rows[0].count,1);
  });
  await t.test('card grant and redemption are atomic, repeat-safe and separate from paid swaps',async()=>{
    await spinWheel(pool,{code:'TEAM01',user,id:randomUUID(),draw:()=>9500});
    await query('UPDATE hackathon_teams SET has_changed_question=TRUE WHERE code=$1',['TEAM01']);
    const id=randomUUID();
    const result=await request('post','/api/mystery-box/teams/:code/free-topic-swap',{requestId:id,topicId:challengeIds[1]});
    assert.equal(result.status,200);assert.equal(result.data.cost,0);assert.equal(result.data.balance,150);assert.equal(result.data.freeChangeCards,0);assert.equal(result.data.hasChangedQuestion,true);
    const duplicate=await request('post','/api/mystery-box/teams/:code/free-topic-swap',{requestId:id,topicId:challengeIds[1]});
    assert.equal(duplicate.status,200);assert.equal(duplicate.data.freeChangeCards,0);
    const invalid=await request('post','/api/mystery-box/teams/:code/free-topic-swap',{requestId:randomUUID(),topicId:challengeIds[2]});
    assert.equal(invalid.status,409);
  });
  await t.test('five spins cap holds across concurrent requests and cannot be reduced below history',async()=>{
    const results=await Promise.allSettled(Array.from({length:5},()=>spinWheel(pool,{code:'TEAM01',user,id:randomUUID(),draw:()=>0})));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,3);
    assert.equal((await team()).spins_used,5);
    assert.equal((await edit({spinsUsed:0})).status,400);
    assert.equal((await edit({spinsUsed:6})).status,400);
  });
  await t.test('failed reward persistence rolls back the point balance and consumed spin',async()=>{
    await db.exec(`CREATE FUNCTION reject_test_spin() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated storage failure'; END; $$;
      CREATE TRIGGER test_spin_failure BEFORE INSERT ON team_wheel_spins FOR EACH ROW EXECUTE FUNCTION reject_test_spin();`);
    await assert.rejects(spinWheel(pool,{code:'TEAM02',user:{sub:'TEAM02',email:'TEAM02@test.local'},id:randomUUID(),draw:()=>9000}));
    assert.equal((await team('TEAM02')).spins_used,0);assert.equal((await team('TEAM02')).points,100);
    await db.exec('DROP TRIGGER test_spin_failure ON team_wheel_spins; DROP FUNCTION reject_test_spin();');
  });
  await t.test('disable hides twists; re-enable preserves resolution and increments reveal version',async()=>{
    await setChaosMode(pool,{enabled:true,reason:'Start round two',actor:'admin'});
    const opened=await team();assert.ok(formatHackathonTeam(opened).chaosEvent);
    await edit({isChaosResolved:true,freeChangeCards:1});
    const blocked=await request('post','/api/mystery-box/teams/:code/free-topic-swap',{requestId:randomUUID(),topicId:challengeIds[2]});assert.equal(blocked.status,409);
    await setChaosMode(pool,{enabled:false,reason:'Pause round two',actor:'admin'});
    assert.equal(formatHackathonTeam(await team()).chaosEvent,null);
    await setChaosMode(pool,{enabled:true,reason:'Resume round two',actor:'admin'});
    assert.equal((await team()).is_chaos_resolved,true);assert.ok((await team()).chaos_version>opened.chaos_version);
    await edit({challengeId:challengeIds[2]});assert.equal((await team()).is_chaos_resolved,false);
    assert.equal((await team()).chaos_event.id,createTeamChallengeSnapshot(getChallengeById(challengeIds[2])).chaosEvent.id);
  });
  await t.test('admin edits, ledger balances, reason validation and re-reveal do not duplicate points',async()=>{
    const before=await team();assert.equal((await edit({reason:'no',points:200})).status,400);
    assert.equal((await edit({points:200,teamName:'Renamed team',isOpened:false})).status,200);
    const opened=await request('post','/api/mystery-box/teams/:code/reveal');assert.equal(opened.status,200);
    await edit({isOpened:false});const again=await request('post','/api/mystery-box/teams/:code/reveal');
    assert.equal(again.data.awardedPoints,0);assert.equal(again.data.balance,opened.data.balance);
    assert.notEqual((await team()).team_name,before.team_name);
    assert.ok((await query("SELECT * FROM hackathon_activity_logs WHERE event_type='ADMIN_TEAM_EDIT'")).rows.length>0);
  });
  await t.test('invited Google identity must match and accepts once; leader transfer precedes removal',async()=>{
    const invited=await request('post','/api/admin/mystery-box/teams/:code/invitations',{email:'new@test.local',reason:'Add teammate'});assert.equal(invited.status,200);
    const invitation=(await query('SELECT * FROM team_member_invitations')).rows[0];
    const denied=await request('post','/api/mystery-box/invitations/:id/accept',{}, {id:invitation.id});assert.equal(denied.status,404);
    const accepted=await request('post','/api/mystery-box/invitations/:id/accept',{}, {id:invitation.id},{email:'new@test.local',sub:'new-google'});assert.equal(accepted.status,200);
    assert.equal((await edit({members:[]})).status,400);
    assert.equal((await edit({members:[{email:'TEAM01@test.local',regNo:'A',isLeader:false},{email:'new@test.local',regNo:'B',isLeader:true}]})).status,200);
    const result=await edit({members:[{email:'new@test.local',regNo:'B',isLeader:true}]});assert.equal(result.status,200);
    await assert.rejects(spinWheel(pool,{code:'TEAM01',user,id:randomUUID()}),{status:403});
  });
  await t.test('migration replay preserves spins, points and card usage',async()=>{
    const before=await team();await initializeEventRewards(pool);const after=await team();
    assert.equal(after.spins_used,before.spins_used);assert.equal(after.points,before.points);assert.equal(after.free_change_cards,before.free_change_cards);
  });
  await db.close();
});
