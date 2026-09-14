# Recruitment Domain and Round 1 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow candidates to apply to any domain combination, complete domain-appropriate Round 1 questions immediately after selection, and give administrators a complete review and question-management workflow.

**Architecture:** Preserve `candidate_subdomain_choices` and represent Finance and Outreach with hidden whole-domain subdomains so existing project and interview foreign keys continue to work. Add focused selection/question rule modules, one idempotent Supabase migration for the new taxonomy and written-answer model, a unified Round 1 hub, and admin views that support unlimited selections and written responses.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript/JavaScript, Tailwind CSS, Supabase Auth/Postgres/RLS, Zod, Node.js test runner

**Spec:** `docs/superpowers/specs/2026-09-15-recruitment-domain-round1-redesign.md`

## Global Constraints

- The active domains are Technical, Events, Design, Publicity, Outreach, and Finance.
- Technical is optional and allows at most two Technical subdomains.
- Non-Technical selections have no global maximum.
- Outreach and Finance are whole-domain candidate choices with no visible subdomain cards.
- Every selected non-Technical domain receives the two common long-form questions once per domain.
- Design additionally requires any two of the three handbook tasks.
- Technical selections retain five scored questions and 25 minutes per selected Technical subdomain.
- Candidate-facing labels use Round 1; Projects and Interviews remain Round 2 and Round 3.
- Existing candidate and assessment records must not be deleted.
- The supplied handbook does not override the user-defined Events, Outreach, or Finance taxonomy.
- Direct file upload is not included; Design submissions use explanation text and shareable links.

## File Structure

- `recruitment/src/lib/selection-rules.mjs`: pure candidate-choice validation and domain grouping.
- `recruitment/src/lib/selection-rules.test.mjs`: Node tests for unlimited non-Technical and Technical maximum behavior.
- `recruitment/src/lib/written-question-rules.mjs`: pure question applicability and completion rules.
- `recruitment/src/lib/written-question-rules.test.mjs`: Node tests for common prompts and Design two-of-three behavior.
- `recruitment/supabase/migrations/202609150001_domain_round1_redesign.sql`: taxonomy, selection RPC, written questions, answers, rules, grants, and RLS.
- `recruitment/supabase/migrations/domain_round1_redesign.contract.test.mjs`: static migration contract checks.
- `recruitment/src/app/profile/complete/page.tsx`: academic-only profile form.
- `recruitment/src/app/api/profile/complete/route.ts`: academic-only profile validation and persistence.
- `recruitment/src/app/dashboard/domain/page.tsx`: expanded selection UI and direct Round 1 routing.
- `recruitment/src/app/dashboard/round-1/page.tsx`: unified written/Technical Round 1 hub.
- `recruitment/src/app/api/round-1/written/route.ts`: load, save, and submit written answers.
- `recruitment/src/app/api/assessment/start/route.ts`: Technical-only question selection.
- `recruitment/src/app/dashboard/assessment/page.tsx`: Technical-only assessment labels and navigation.
- `recruitment/src/app/recruitment/page.tsx`: dashboard links/status aligned to Round 1.
- `recruitment/src/types/index.ts`: written-question, answer, rule, and selection metadata types.
- `recruitment/src/app/admin/operations/page.tsx`: unlimited choices, written answers, filters, dossier, and CSV.
- `recruitment/src/app/admin/operations/question-bank.tsx`: written question/rule administration plus the existing guideline type fix.
- `recruitment/src/app/api/admin/operations/route.ts`: include written data in the operations payload.
- `recruitment/src/app/api/admin/questions/route.ts`: manage scored and written questions with explicit modes.
- `recruitment/src/app/admin/candidates/page.tsx`: all-choice display and domain filtering.
- `recruitment/src/app/admin/domains/page.tsx`: whole-domain metadata display and management.
- `recruitment/package.json`: add deterministic `test` and `check` scripts.
- `recruitment/README.md`: document migration order, selection rules, question behavior, and verification commands.

---

### Task 1: Extract and Test Selection and Written-Question Rules

**Files:**
- Create: `recruitment/src/lib/selection-rules.mjs`
- Create: `recruitment/src/lib/selection-rules.test.mjs`
- Create: `recruitment/src/lib/written-question-rules.mjs`
- Create: `recruitment/src/lib/written-question-rules.test.mjs`
- Modify: `recruitment/package.json`

**Interfaces:**
- Produces: `validateTrackSelection(selectedTracks): { valid: boolean; code?: string }`
- Produces: `toggleTrackSelection(currentIds, nextTrack, allTracks): { ids: string[]; error?: string }`
- Produces: `groupSelectionsByDomain(selectedTracks): Map<string, TrackSelection[]>`
- Produces: `questionsForSelections(questions, selectedDomainIds): WrittenQuestion[]`
- Produces: `validateWrittenCompletion(questions, rules, answers): { valid: boolean; missing: string[] }`

- [ ] **Step 1: Add failing selection tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTrackSelection } from './selection-rules.mjs';

const track = (id, domainSlug) => ({ id, domainId: domainSlug, domainSlug });

test('accepts unlimited non-Technical selections', () => {
  const result = validateTrackSelection([
    track('events-1', 'events'), track('events-2', 'events'),
    track('design-1', 'design'), track('publicity-1', 'publicity'),
    track('outreach', 'outreach'), track('finance', 'finance'),
  ]);
  assert.deepEqual(result, { valid: true });
});

test('accepts two Technical selections and rejects the third', () => {
  assert.equal(validateTrackSelection([track('web', 'technical'), track('app', 'technical')]).valid, true);
  assert.deepEqual(
    validateTrackSelection([track('web', 'technical'), track('app', 'technical'), track('ai-ml', 'technical')]),
    { valid: false, code: 'TECHNICAL_SELECTION_LIMIT' },
  );
});

test('requires at least one selection and rejects duplicate ids', () => {
  assert.equal(validateTrackSelection([]).code, 'SELECTION_REQUIRED');
  assert.equal(validateTrackSelection([track('web', 'technical'), track('web', 'technical')]).code, 'DUPLICATE_SELECTION');
});
```

- [ ] **Step 2: Run the selection tests and verify the missing-module failure**

Run: `node --test recruitment/src/lib/selection-rules.test.mjs`

Expected: FAIL because `selection-rules.mjs` does not exist.

- [ ] **Step 3: Implement the minimal selection rules**

```js
export function validateTrackSelection(selectedTracks) {
  if (selectedTracks.length === 0) return { valid: false, code: 'SELECTION_REQUIRED' };
  if (new Set(selectedTracks.map((track) => track.id)).size !== selectedTracks.length) {
    return { valid: false, code: 'DUPLICATE_SELECTION' };
  }
  if (selectedTracks.filter((track) => track.domainSlug === 'technical').length > 2) {
    return { valid: false, code: 'TECHNICAL_SELECTION_LIMIT' };
  }
  return { valid: true };
}

export function groupSelectionsByDomain(selectedTracks) {
  return selectedTracks.reduce((groups, track) => {
    groups.set(track.domainId, [...(groups.get(track.domainId) ?? []), track]);
    return groups;
  }, new Map());
}
```

- [ ] **Step 4: Add failing written-question tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { questionsForSelections, validateWrittenCompletion } from './written-question-rules.mjs';

test('applies common prompts once to every selected non-Technical domain', () => {
  const questions = [
    { id: 'why', scope: 'common_non_technical' },
    { id: 'work', scope: 'common_non_technical' },
    { id: 'design-task-1', scope: 'domain', domainId: 'design' },
  ];
  const applied = questionsForSelections(questions, ['events', 'design']);
  assert.deepEqual(applied.map((item) => `${item.domainId}:${item.id}`), [
    'events:why', 'events:work', 'design:why', 'design:work', 'design:design-task-1',
  ]);
});

test('requires both common answers and any two Design tasks', () => {
  const questions = [
    { id: 'why', domainId: 'design', group: 'common', required: true },
    { id: 'work', domainId: 'design', group: 'common', required: true },
    { id: 'd1', domainId: 'design', group: 'design_tasks', required: false },
    { id: 'd2', domainId: 'design', group: 'design_tasks', required: false },
    { id: 'd3', domainId: 'design', group: 'design_tasks', required: false },
  ];
  const rules = [{ domainId: 'design', group: 'design_tasks', minimumAnswers: 2 }];
  const result = validateWrittenCompletion(questions, rules, { why: 'Because', work: 'Details', d1: 'Link', d2: 'Link' });
  assert.deepEqual(result, { valid: true, missing: [] });
});
```

- [ ] **Step 5: Run the written-question tests and verify the missing-module failure**

Run: `node --test recruitment/src/lib/written-question-rules.test.mjs`

Expected: FAIL because `written-question-rules.mjs` does not exist.

- [ ] **Step 6: Implement the minimal written-question rules and package scripts**

Implement deterministic expansion of common questions per selected non-Technical domain, preserve domain-question order, require every `required` question, and enforce each `{ domainId, group, minimumAnswers }` rule using non-empty trimmed answers. Add:

```json
{
  "scripts": {
    "test": "node --test",
    "check": "npm test && next build"
  }
}
```

- [ ] **Step 7: Run rule tests**

Run: `npm --prefix recruitment test -- src/lib/selection-rules.test.mjs src/lib/written-question-rules.test.mjs`

Expected: PASS with all rule tests successful.

- [ ] **Step 8: Commit the rule boundary**

```bash
git add recruitment/package.json recruitment/src/lib/selection-rules.mjs recruitment/src/lib/selection-rules.test.mjs recruitment/src/lib/written-question-rules.mjs recruitment/src/lib/written-question-rules.test.mjs
git commit -m "test: define recruitment selection and question rules"
```

### Task 2: Add the Idempotent Supabase Migration

**Files:**
- Create: `recruitment/supabase/migrations/202609150001_domain_round1_redesign.sql`
- Create: `recruitment/supabase/migrations/domain_round1_redesign.contract.test.mjs`

**Interfaces:**
- Produces: RPC `set_candidate_subdomains(p_subdomain_ids uuid[])`
- Produces: tables `written_application_questions`, `written_application_rules`, `candidate_written_answers`
- Produces: domain field `selection_mode text CHECK (selection_mode IN ('subdomains','whole_domain'))`

- [ ] **Step 1: Write the failing migration contract test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('./202609150001_domain_round1_redesign.sql', import.meta.url), 'utf8');

test('migration contains the authoritative taxonomy', () => {
  for (const slug of ['technical', 'events', 'design', 'publicity', 'outreach', 'finance']) {
    assert.match(sql, new RegExp(`'${slug}'`));
  }
  for (const name of ['Operations & Execution', 'Logistics and Participant Management', 'Event Ideation and Planning', 'Digital Graphic Design', 'Art & Craft / Physical Design', 'UI/UX Design', 'Social Media Management', 'Content & Video Editing', 'Event Promotion']) {
    assert.ok(sql.includes(name));
  }
});

test('migration enforces the Technical-only maximum and written-answer RLS', () => {
  assert.match(sql, /TECHNICAL_SELECTION_LIMIT/);
  assert.match(sql, /candidate_written_answers ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /candidate_id = auth\.uid\(\)/);
});
```

- [ ] **Step 2: Run the migration test and verify failure**

Run: `node --test recruitment/supabase/migrations/domain_round1_redesign.contract.test.mjs`

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Write the migration**

Create the schema described in the spec using stable slugs and `INSERT ... ON CONFLICT ... DO UPDATE`. Add hidden subdomains with slugs `outreach-whole` and `finance-whole`; set `selection_mode='whole_domain'` for those domains. Replace the `priority IN (1,2)` constraint with `priority > 0`. Recreate `set_candidate_subdomains` so it:

```sql
IF coalesce(array_length(p_subdomain_ids, 1), 0) < 1 THEN
  RAISE EXCEPTION 'SELECTION_REQUIRED';
END IF;

IF (SELECT count(*)
    FROM public.subdomains s
    JOIN public.domains d ON d.id = s.domain_id
    WHERE s.id = ANY(p_subdomain_ids) AND d.slug = 'technical') > 2 THEN
  RAISE EXCEPTION 'TECHNICAL_SELECTION_LIMIT';
END IF;
```

Create written-question rows with `scope`, `domain_id`, `question_group`, `prompt`, `instructions`, `response_type`, `required`, `sort_order`, and `is_active`. Store answers with `answer_text`, `submission_links jsonb`, `is_final`, and timestamps. Seed the two common questions, the three complete Design briefs from the spec, and a Design rule requiring two answers from `design_tasks`.

- [ ] **Step 4: Run the migration contract test**

Run: `node --test recruitment/supabase/migrations/domain_round1_redesign.contract.test.mjs`

Expected: PASS.

- [ ] **Step 5: Validate SQL against a disposable or configured database**

When `DATABASE_URL` is available, run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f recruitment/supabase/migrations/202609150001_domain_round1_redesign.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f recruitment/supabase/migrations/202609150001_domain_round1_redesign.sql
```

Expected: both runs succeed, proving idempotency. If only the hosted Supabase SQL editor is available, apply the file twice there and confirm both runs succeed before live-flow verification.

- [ ] **Step 6: Commit the migration**

```bash
git add recruitment/supabase/migrations/202609150001_domain_round1_redesign.sql recruitment/supabase/migrations/domain_round1_redesign.contract.test.mjs
git commit -m "feat: migrate recruitment taxonomy and written questions"
```

### Task 3: Simplify Profile Completion

**Files:**
- Modify: `recruitment/src/app/profile/complete/page.tsx`
- Modify: `recruitment/src/app/api/profile/complete/route.ts`
- Create: `recruitment/src/lib/profile-schema.mjs`
- Create: `recruitment/src/lib/profile-schema.test.mjs`

**Interfaces:**
- Produces: `validateProfilePayload(payload)` accepting only registration number, phone, year, and branch.

- [ ] **Step 1: Add failing profile-schema tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfilePayload } from './profile-schema.mjs';

test('accepts the academic-only profile payload', () => {
  assert.equal(validateProfilePayload({ registration_number: '22BCE1234', phone: '9876543210', year: 3, branch: 'CSE' }).success, true);
});

test('does not require online-presence fields', () => {
  const result = validateProfilePayload({ registration_number: '22BCE1234', phone: '9876543210', year: 3, branch: 'CSE' });
  assert.equal(result.success, true);
  assert.equal('github_url' in result.data, false);
});
```

- [ ] **Step 2: Run the profile tests and verify failure**

Run: `node --test recruitment/src/lib/profile-schema.test.mjs`

Expected: FAIL because `profile-schema.mjs` does not exist.

- [ ] **Step 3: Implement the academic schema and update API/UI**

Use Zod-compatible validation rules equivalent to registration length 5+, phone length 10+, integer year 1-5, and branch length 2+. Remove `github_url`, `linkedin_url`, and `portfolio_url` from the form schema, defaults, rendered `ONLINE_PRESENCE` section, API schema, and update payload. Route successful completion to `/dashboard/domain`.

- [ ] **Step 4: Run profile and existing rule tests**

Run: `npm --prefix recruitment test`

Expected: PASS.

- [ ] **Step 5: Commit the profile change**

```bash
git add recruitment/src/app/profile/complete/page.tsx recruitment/src/app/api/profile/complete/route.ts recruitment/src/lib/profile-schema.mjs recruitment/src/lib/profile-schema.test.mjs
git commit -m "feat: simplify recruitment profile completion"
```

### Task 4: Expand Candidate Domain Selection

**Files:**
- Modify: `recruitment/src/app/dashboard/domain/page.tsx`
- Modify: `recruitment/src/types/index.ts`

**Interfaces:**
- Consumes: `validateTrackSelection` from Task 1.
- Consumes: RPC `set_candidate_subdomains` and `domains.selection_mode` from Task 2.
- Produces: successful navigation to `/dashboard/round-1`.

- [ ] **Step 1: Add UI-oriented selection cases to `selection-rules.test.mjs`**

Add assertions that the whole-domain hidden track can toggle like any other ID, removal preserves the order of remaining IDs, and a third Technical selection returns `TECHNICAL_SELECTION_LIMIT` without discarding current choices.

- [ ] **Step 2: Run the expanded tests and verify the new case fails**

Run: `node --test recruitment/src/lib/selection-rules.test.mjs`

Expected: FAIL on the newly introduced ordering/toggle helper.

- [ ] **Step 3: Add `toggleTrackSelection` and update the page**

Implement:

```js
export function toggleTrackSelection(currentIds, nextTrack, allTracks) {
  if (currentIds.includes(nextTrack.id)) return { ids: currentIds.filter((id) => id !== nextTrack.id) };
  const proposed = [...currentIds, nextTrack.id];
  const validation = validateTrackSelection(proposed.map((id) => allTracks.find((track) => track.id === id)));
  return validation.valid ? { ids: proposed } : { ids: currentIds, error: validation.code };
}
```

Update the page copy, remove `/2` counters and primary/secondary labels, render whole-domain `+` controls beside Finance and Outreach headings, render cards for other domains, show a targeted third-Technical warning, and preserve all selected chips. On save, call the RPC and route directly to `/dashboard/round-1`.

- [ ] **Step 4: Run tests and type-check through the build**

Run: `npm --prefix recruitment test && npm --prefix recruitment run build`

Expected: PASS.

- [ ] **Step 5: Commit candidate selection**

```bash
git add recruitment/src/app/dashboard/domain/page.tsx recruitment/src/types/index.ts recruitment/src/lib/selection-rules.mjs recruitment/src/lib/selection-rules.test.mjs
git commit -m "feat: support expanded recruitment selections"
```

### Task 5: Build Written Round 1 APIs and Candidate Hub

**Files:**
- Create: `recruitment/src/app/api/round-1/written/route.ts`
- Create: `recruitment/src/app/dashboard/round-1/page.tsx`
- Modify: `recruitment/src/types/index.ts`
- Modify: `recruitment/src/app/recruitment/page.tsx`

**Interfaces:**
- Consumes: written-question tables/RLS from Task 2.
- Consumes: `questionsForSelections` and `validateWrittenCompletion` from Task 1.
- Produces: `GET /api/round-1/written` returning selected domains, applicable questions, rules, answers, and completion.
- Produces: `PUT /api/round-1/written` saving drafts.
- Produces: `POST /api/round-1/written` validating and finalizing answers.

- [ ] **Step 1: Extend question-rule tests for mixed applications**

Add a case selecting Events, two Design subdomains, Finance, and Technical/Web. Assert common prompts expand once for Events, once for Design, and once for Finance; Design tasks appear once; no written prompts are generated for Technical.

- [ ] **Step 2: Run the new mixed-flow test and verify failure**

Run: `node --test recruitment/src/lib/written-question-rules.test.mjs`

Expected: FAIL until Technical exclusion and domain de-duplication are implemented.

- [ ] **Step 3: Implement the authenticated written-answer API**

Use the bearer token pattern already present in `api/assessment/start/route.ts`. Load current candidate choices with their domains, expand applicable questions, return existing answers, and reject answer IDs outside that set. `PUT` upserts drafts with `is_final=false`; `POST` validates required common prompts plus per-domain minimum rules and updates accepted answers to `is_final=true`. Return stable error codes `MIGRATION_REQUIRED`, `WRITTEN_ANSWERS_INCOMPLETE`, and `APPLICATION_DEADLINE_PASSED` with readable messages.

- [ ] **Step 4: Implement the Round 1 hub**

Render one section per selected non-Technical domain, long-form textareas for common prompts, optional link rows for task questions, and Design progress such as `1/2 tasks completed`. Include autosave status, explicit final submission, retained local input after errors, and a Technical assessment card only when Technical choices exist. When no Technical choice exists, written completion finishes Round 1; when Technical exists, show completion of both components.

- [ ] **Step 5: Update recruitment dashboard navigation**

Change candidate-facing assessment labels to Round 1, point the active-stage action to `/dashboard/round-1`, and keep Projects and Interviews labelled Round 2 and Round 3.

- [ ] **Step 6: Run unit tests and build**

Run: `npm --prefix recruitment test && npm --prefix recruitment run build`

Expected: PASS.

- [ ] **Step 7: Commit the written Round 1 flow**

```bash
git add recruitment/src/app/api/round-1/written/route.ts recruitment/src/app/dashboard/round-1/page.tsx recruitment/src/app/recruitment/page.tsx recruitment/src/types/index.ts recruitment/src/lib/written-question-rules.mjs recruitment/src/lib/written-question-rules.test.mjs
git commit -m "feat: add written Round 1 application flow"
```

### Task 6: Restrict the Scored Assessment to Technical Tracks

**Files:**
- Modify: `recruitment/src/app/api/assessment/start/route.ts`
- Modify: `recruitment/src/app/api/assessment/submit/route.ts`
- Modify: `recruitment/src/app/dashboard/assessment/page.tsx`
- Create: `recruitment/src/lib/assessment-track-rules.mjs`
- Create: `recruitment/src/lib/assessment-track-rules.test.mjs`

**Interfaces:**
- Produces: `technicalAssessmentTracks(choices): Choice[]`.
- Maintains: five questions and 1,500 seconds per Technical subdomain.

- [ ] **Step 1: Write failing Technical-track tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { technicalAssessmentTracks } from './assessment-track-rules.mjs';

test('filters non-Technical choices from scored assessment', () => {
  const choices = [
    { id: 'web', domainSlug: 'technical' },
    { id: 'design', domainSlug: 'design' },
    { id: 'finance', domainSlug: 'finance' },
  ];
  assert.deepEqual(technicalAssessmentTracks(choices).map((item) => item.id), ['web']);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test recruitment/src/lib/assessment-track-rules.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement Technical-only attempt creation**

Filter choices by joined domain slug `technical`, return `NO_TECHNICAL_ASSESSMENT_REQUIRED` when none exist, keep five active questions per Technical subdomain, and set `time_limit_seconds` to `1500 * technicalChoices.length`. Never request question-bank rows for non-Technical tracks.

- [ ] **Step 4: Align submission status and assessment UI**

After assessment submission, mark the Technical component complete without claiming all Round 1 components are complete until written submissions are also final. Remove non-Technical tabs and update all candidate-facing copy to Technical assessment within Round 1.

- [ ] **Step 5: Run tests and build**

Run: `npm --prefix recruitment test && npm --prefix recruitment run build`

Expected: PASS.

- [ ] **Step 6: Commit Technical assessment adaptation**

```bash
git add recruitment/src/app/api/assessment/start/route.ts recruitment/src/app/api/assessment/submit/route.ts recruitment/src/app/dashboard/assessment/page.tsx recruitment/src/lib/assessment-track-rules.mjs recruitment/src/lib/assessment-track-rules.test.mjs
git commit -m "feat: scope Round 1 assessment to Technical tracks"
```

### Task 7: Restore and Expand Admin Operations

**Files:**
- Modify: `recruitment/src/app/api/admin/operations/route.ts`
- Modify: `recruitment/src/app/api/admin/questions/route.ts`
- Modify: `recruitment/src/app/admin/operations/page.tsx`
- Modify: `recruitment/src/app/admin/operations/question-bank.tsx`
- Modify: `recruitment/src/app/admin/candidates/page.tsx`
- Modify: `recruitment/src/app/admin/domains/page.tsx`
- Create: `recruitment/src/lib/admin-export.mjs`
- Create: `recruitment/src/lib/admin-export.test.mjs`

**Interfaces:**
- Produces: operations payload containing `written_questions`, `written_rules`, and `written_answers`.
- Produces: `candidateCsvRow(candidateRecord)` preserving every choice and written response.

- [ ] **Step 1: Write a failing admin export test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateCsvRow } from './admin-export.mjs';

test('exports unlimited choices and written answers', () => {
  const row = candidateCsvRow({
    profile: { registration_number: '22BCE1234', full_name: 'Candidate' },
    choices: ['Technical / Web', 'Events / Operations & Execution', 'Finance'],
    writtenAnswers: [
      { domain: 'Finance', prompt: 'Why do you want to join this club?', answer: 'I enjoy budgeting.' },
    ],
  });
  assert.match(row.choices, /Technical \/ Web \| Events \/ Operations & Execution \| Finance/);
  assert.match(row.written_responses, /Finance.*I enjoy budgeting/);
});
```

- [ ] **Step 2: Run the export test and verify failure**

Run: `node --test recruitment/src/lib/admin-export.test.mjs`

Expected: FAIL because `admin-export.mjs` does not exist.

- [ ] **Step 3: Expand operations API and admin views**

Fetch written questions, rules, and answers using the authenticated admin client. Display all choices without PRI/SEC assumptions, show whole-domain selections without their hidden subdomain name, support domain/subdomain filters, render written responses and task links in the dossier, and export complete escaped CSV fields through `candidateCsvRow`.

- [ ] **Step 4: Expand question management**

Add an explicit mode selector for scored Technical questions versus written non-Technical questions. For written questions, support common/domain scope, prompt, instructions, response type, active state, sort order, and minimum-answer rule. Keep scored-answer controls available only in Technical mode.

- [ ] **Step 5: Fix the existing guideline type error**

Replace indexing through the broad `AuthoringRound` union with a narrowed key:

```ts
function selectRound(round: AuthoringRound) {
  setActiveRound(round);
  setError('');
  setMessage('');
  if (round === 2 || round === 3) {
    setGuidelineDraft(guidelines[round]?.guidelines ?? '');
  }
}
```

- [ ] **Step 6: Update candidates and domains pages**

List every application choice, filter by domain independently from subdomain, hide synthetic Finance/Outreach subdomain labels, and expose each domain's `selection_mode` in domain administration without allowing deletion of referenced rows.

- [ ] **Step 7: Run admin export tests and full build**

Run: `npm --prefix recruitment test && npm --prefix recruitment run build`

Expected: PASS with no TypeScript error in `question-bank.tsx`.

- [ ] **Step 8: Commit admin compatibility**

```bash
git add recruitment/src/app/api/admin/operations/route.ts recruitment/src/app/api/admin/questions/route.ts recruitment/src/app/admin/operations/page.tsx recruitment/src/app/admin/operations/question-bank.tsx recruitment/src/app/admin/candidates/page.tsx recruitment/src/app/admin/domains/page.tsx recruitment/src/lib/admin-export.mjs recruitment/src/lib/admin-export.test.mjs
git commit -m "feat: expand recruitment admin review workflow"
```

### Task 8: Documentation and End-to-End Verification

**Files:**
- Modify: `recruitment/README.md`

**Interfaces:**
- Consumes: all candidate/admin interfaces from Tasks 1-7.
- Produces: documented migration and verification procedure.

- [ ] **Step 1: Update local setup and migration documentation**

Document that `202609150001_domain_round1_redesign.sql` runs after `202609140008_round_content_and_identity.sql`, explain whole-domain choices, list the authoritative taxonomy, state the Technical two-subdomain maximum, describe common written questions and Design's any-two task rule, and note that additional domain-specific sets can be added through admin question management.

- [ ] **Step 2: Run all automated verification**

Run:

```bash
npm --prefix recruitment test
npm --prefix recruitment run build
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 3: Verify candidate flows against the migrated Supabase project**

Check these exact scenarios in the browser:

1. Non-Technical only: Events + Design + Finance saves, routes to Round 1, shows common prompts once per domain, and Design requires any two tasks.
2. Technical only: Web + AI/ML saves, routes to Round 1, and offers ten scored questions with 50 minutes.
3. Mixed: Technical/Web + Events/Operations & Execution + Outreach saves; written prompts appear for Events and Outreach only, and the Technical assessment contains five Web questions.
4. Limit: adding a third Technical subdomain shows the targeted warning without removing existing choices.
5. Profile: GitHub, LinkedIn, and Portfolio are absent and academic submission succeeds.

- [ ] **Step 4: Verify admin flows**

Use the development-only local admin entry and confirm Domains, Candidates, Assessments, Operations, question management, dossier written answers, filters, and CSV export work with the three candidate scenarios. Confirm Finance and Outreach appear as domains rather than synthetic subdomain names.

- [ ] **Step 5: Verify responsive presentation**

Inspect profile completion, domain selection, Round 1, candidate dashboard, and admin operations at desktop width and a 390-pixel mobile viewport. Confirm no clipped choice chips, task instructions, answer fields, tables, dialogs, or sticky actions.

- [ ] **Step 6: Commit documentation**

```bash
git add recruitment/README.md
git commit -m "docs: document redesigned recruitment workflow"
```

- [ ] **Step 7: Review final repository state**

Run: `git status --short` and `git log --oneline -10`

Expected: only pre-existing user-owned changes remain unstaged; the feature commits are present in task order.
