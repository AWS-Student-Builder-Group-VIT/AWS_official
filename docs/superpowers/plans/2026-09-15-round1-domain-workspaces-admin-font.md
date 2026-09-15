# Round 1 Domain Workspaces and Admin Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clickable Round 1 hub with independent non-Technical domain submissions, Technical subdomain entry cards, and Josefin Sans throughout the admin interface.

**Architecture:** Keep `candidate_written_answers.is_final` as the per-domain source of truth. Extract pure domain-state and payload-validation helpers, make the written API accept one target `domainId`, and render the candidate route as either a card hub or one focused domain workspace. Preserve the existing single combined Technical attempt and pass the selected Technical subdomain as a client-side entry hint.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Supabase, Zod, Tailwind CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-15-round1-domain-workspaces-admin-font.md`

## Global Constraints

- Do not add polling, Redis, or realtime subscriptions.
- Do not add a database table or migration.
- A submitted written domain is immutable while other domains remain editable.
- Technical subdomain cards enter the existing combined Technical attempt; they do not create separate attempts.
- Candidate typography remains Inter and Space Mono; only `/admin` uses Josefin Sans.
- Preserve the user's unrelated root changes in `README.md`, `package.json`, and `src/App.jsx`.

---

### Task 1: Per-domain Round 1 state rules

**Files:**
- Create: `recruitment/src/lib/round-one-domain-rules.mjs`
- Create: `recruitment/src/lib/round-one-domain-rules.test.mjs`

**Interfaces:**
- Consumes: applicable question objects with `domainId`, `id`, `answerKey`, `group`, and `required`; rule objects with `domainId`, `group`, and `minimumAnswers`; answer objects with `domain_id`, `question_id`, `answer_text`, `submission_links`, and `is_final`.
- Produces: `domainSubmissionState(domainId, questions, rules, answers) -> { status, hasContent, valid, final, missing }` and `overallRoundOneComplete(domainStates, technicalComplete) -> boolean`.

- [ ] **Step 1: Write failing state tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { domainSubmissionState, overallRoundOneComplete } from './round-one-domain-rules.mjs';

const questions = [
  { id: 'q1', domainId: 'finance', answerKey: 'finance:q1', group: 'common', required: true },
  { id: 'q2', domainId: 'finance', answerKey: 'finance:q2', group: 'common', required: true },
  { id: 'q3', domainId: 'design', answerKey: 'design:q3', group: 'design_tasks', required: false },
  { id: 'q4', domainId: 'design', answerKey: 'design:q4', group: 'design_tasks', required: false },
  { id: 'q5', domainId: 'design', answerKey: 'design:q5', group: 'design_tasks', required: false },
];
const rules = [{ domainId: 'design', group: 'design_tasks', minimumAnswers: 2 }];

test('reports not_started when a domain has no response content', () => {
  assert.equal(domainSubmissionState('finance', questions, rules, []).status, 'not_started');
});

test('reports draft when a domain has content but is not final', () => {
  const state = domainSubmissionState('finance', questions, rules, [
    { domain_id: 'finance', question_id: 'q1', answer_text: 'AWS', submission_links: [], is_final: false },
  ]);
  assert.equal(state.status, 'draft');
  assert.equal(state.valid, false);
});

test('reports submitted only when the target domain is valid and all applicable answers are final', () => {
  const state = domainSubmissionState('finance', questions, rules, [
    { domain_id: 'finance', question_id: 'q1', answer_text: 'AWS', submission_links: [], is_final: true },
    { domain_id: 'finance', question_id: 'q2', answer_text: 'Work', submission_links: [], is_final: true },
  ]);
  assert.deepEqual(state, { status: 'submitted', hasContent: true, valid: true, final: true, missing: [] });
});

test('applies grouped minimum-answer rules within one domain', () => {
  const state = domainSubmissionState('design', questions, rules, [
    { domain_id: 'design', question_id: 'q3', answer_text: 'One', submission_links: [], is_final: false },
  ]);
  assert.equal(state.valid, false);
  assert.deepEqual(state.missing, ['design_tasks']);
});

test('requires every written domain and the combined technical attempt', () => {
  assert.equal(overallRoundOneComplete([{ final: true }, { final: true }], true), true);
  assert.equal(overallRoundOneComplete([{ final: true }, { final: false }], true), false);
  assert.equal(overallRoundOneComplete([{ final: true }], false), false);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm --prefix recruitment test -- src/lib/round-one-domain-rules.test.mjs`

Expected: FAIL because `round-one-domain-rules.mjs` does not exist.

- [ ] **Step 3: Implement the pure state helpers**

```js
import { validateWrittenCompletion } from './written-question-rules.mjs';

function content(answer) {
  return answer?.answer_text?.trim() || answer?.submission_links?.filter(Boolean).join('\n') || '';
}

export function domainSubmissionState(domainId, questions, rules, answers) {
  const domainQuestions = questions.filter((question) => question.domainId === domainId);
  const domainRules = rules.filter((rule) => rule.domainId === domainId);
  const domainAnswers = answers.filter((answer) => answer.domain_id === domainId);
  const answerMap = Object.fromEntries(domainAnswers.map((answer) => [
    `${answer.domain_id}:${answer.question_id}`,
    content(answer),
  ]));
  const completion = validateWrittenCompletion(domainQuestions, domainRules, answerMap);
  const hasContent = domainAnswers.some((answer) => Boolean(content(answer)));
  const applicableIds = new Set(domainQuestions.map((question) => question.id));
  const final = completion.valid && domainQuestions.every((question) =>
    domainAnswers.some((answer) => answer.question_id === question.id && answer.is_final && applicableIds.has(answer.question_id)),
  );
  return {
    status: final ? 'submitted' : hasContent ? 'draft' : 'not_started',
    hasContent,
    valid: completion.valid,
    final,
    missing: completion.missing,
  };
}

export function overallRoundOneComplete(domainStates, technicalComplete) {
  return domainStates.every((state) => state.final) && technicalComplete;
}
```

- [ ] **Step 4: Run the focused and full suites and verify GREEN**

Run: `npm --prefix recruitment test -- src/lib/round-one-domain-rules.test.mjs`

Expected: all new tests pass.

Run: `npm --prefix recruitment test`

Expected: all existing and new tests pass with zero failures.

- [ ] **Step 5: Commit the state boundary**

```bash
git add recruitment/src/lib/round-one-domain-rules.mjs recruitment/src/lib/round-one-domain-rules.test.mjs
git commit -m "test: define per-domain Round 1 states"
```

---

### Task 2: Targeted written-domain API

**Files:**
- Modify: `recruitment/src/app/api/round-1/written/route.ts`
- Modify: `recruitment/src/lib/round-one-domain-rules.mjs`
- Modify: `recruitment/src/lib/round-one-domain-rules.test.mjs`

**Interfaces:**
- Consumes: request body `{ domainId: string; answers: WrittenAnswerInput[] }` for `PUT` and `POST`.
- Produces: GET payload containing `domainStates: Record<string, DomainSubmissionState>` and `roundOneComplete: boolean`; PUT response `{ saved: true, domainId }`; POST response `{ submitted: true, domainId, roundOneComplete }`.
- Produces helper: `validateDomainWriteTarget({ domainId, domains, questions, answers, domainFinal }) -> { valid: boolean; code?: string }`.

- [ ] **Step 1: Add failing payload-boundary tests**

```js
import { validateDomainWriteTarget } from './round-one-domain-rules.mjs';

const domains = [
  { id: 'finance', slug: 'finance' },
  { id: 'design', slug: 'design' },
  { id: 'technical', slug: 'technical' },
];

test('accepts answers only for the selected non-Technical target domain', () => {
  assert.deepEqual(validateDomainWriteTarget({
    domainId: 'finance', domains, questions, answers: [{ domainId: 'finance', questionId: 'q1' }], domainFinal: false,
  }), { valid: true });
});

test('rejects a cross-domain answer', () => {
  assert.equal(validateDomainWriteTarget({
    domainId: 'finance', domains, questions, answers: [{ domainId: 'design', questionId: 'q3' }], domainFinal: false,
  }).code, 'CROSS_DOMAIN_ANSWER');
});

test('rejects Technical, unselected, and already-final targets', () => {
  assert.equal(validateDomainWriteTarget({ domainId: 'technical', domains, questions, answers: [], domainFinal: false }).code, 'TECHNICAL_DOMAIN_NOT_WRITABLE');
  assert.equal(validateDomainWriteTarget({ domainId: 'outreach', domains, questions, answers: [], domainFinal: false }).code, 'DOMAIN_NOT_SELECTED');
  assert.equal(validateDomainWriteTarget({ domainId: 'finance', domains, questions, answers: [], domainFinal: true }).code, 'DOMAIN_ALREADY_SUBMITTED');
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm --prefix recruitment test -- src/lib/round-one-domain-rules.test.mjs`

Expected: FAIL because `validateDomainWriteTarget` is not exported.

- [ ] **Step 3: Implement target validation and change the route contract**

Add `domainId: z.string().uuid()` to the route payload schema. Implement `validateDomainWriteTarget` so it verifies selected membership, rejects `technical`, rejects an already-final target, requires every submitted answer to have the target `domainId`, and requires every `questionId` to occur in the target domain's applicable questions.

In `loadRoundOne`, replace `writtenFinal` with:

```ts
const writtenDomains = domains.filter((domain) => domain.slug !== 'technical');
const domainStates = Object.fromEntries(writtenDomains.map((domain) => [
  domain.id,
  domainSubmissionState(domain.id, applicableQuestions, rules, answers || []),
]));
const technicalComplete = !technicalRequired || attempt?.status === 'submitted';
const roundOneComplete = overallRoundOneComplete(Object.values(domainStates), technicalComplete);
```

In `handleWrite`, validate `parsed.data.domainId` before writing. Filter upserts to that domain. For POST, validate completion using only target-domain questions and rules, then finalize only applicable target rows:

```ts
await auth.admin.from('candidate_written_answers')
  .update({ is_final: true, updated_at: new Date().toISOString() })
  .eq('candidate_id', auth.candidateId)
  .eq('domain_id', parsed.data.domainId)
  .in('question_id', targetQuestionIds);
```

Return status 409 with `DOMAIN_ALREADY_SUBMITTED` for writes to a final domain, and preserve the existing deadline and missing-answer response behavior. Update `candidate_profiles.round_0_status` only when the refreshed `roundOneComplete` value is true.

- [ ] **Step 4: Run tests and production compilation**

Run: `npm --prefix recruitment test`

Expected: all tests pass.

Run: `npm --prefix recruitment run build`

Expected: Next.js compilation and type checking complete successfully.

- [ ] **Step 5: Commit the API change**

```bash
git add recruitment/src/app/api/round-1/written/route.ts recruitment/src/lib/round-one-domain-rules.mjs recruitment/src/lib/round-one-domain-rules.test.mjs
git commit -m "feat: submit Round 1 domains independently"
```

---

### Task 3: Clickable Round 1 hub and focused workspaces

**Files:**
- Modify: `recruitment/src/app/dashboard/round-1/page.tsx`
- Modify: `recruitment/src/app/dashboard/assessment/page.tsx`
- Create: `recruitment/src/lib/round-one-hub-rules.mjs`
- Create: `recruitment/src/lib/round-one-hub-rules.test.mjs`

**Interfaces:**
- Consumes: GET response with `domains`, `questions`, `rules`, `answers`, `domainStates`, `roundOneComplete`, and aggregate `technical` state.
- Produces: `roundOneCards(domains, domainStates, technical) -> Array<{ key, kind, title, subtitle, status, domainId?, subdomainId? }>`.
- Uses query string `?track=<subdomain UUID>` when a Technical card opens `/dashboard/assessment`.

- [ ] **Step 1: Write failing hub-card tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { roundOneCards } from './round-one-hub-rules.mjs';

test('creates one written card per non-Technical domain and one card per Technical track', () => {
  const cards = roundOneCards([
    { id: 'finance', name: 'Finance', slug: 'finance', tracks: [{ id: 'finance-whole', name: 'Finance' }] },
    { id: 'technical', name: 'Technical', slug: 'technical', tracks: [{ id: 'web', name: 'Web Development' }, { id: 'ai', name: 'AI / ML' }] },
  ], { finance: { status: 'draft' } }, { complete: false });
  assert.deepEqual(cards.map(({ kind, title, status }) => ({ kind, title, status })), [
    { kind: 'written', title: 'Finance', status: 'draft' },
    { kind: 'technical', title: 'Web Development', status: 'not_started' },
    { kind: 'technical', title: 'AI / ML', status: 'not_started' },
  ]);
});

test('shares submitted Technical status across its subdomain entry cards', () => {
  const cards = roundOneCards([
    { id: 'technical', name: 'Technical', slug: 'technical', tracks: [{ id: 'web', name: 'Web Development' }] },
  ], {}, { complete: true });
  assert.equal(cards[0].status, 'submitted');
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm --prefix recruitment test -- src/lib/round-one-hub-rules.test.mjs`

Expected: FAIL because `round-one-hub-rules.mjs` does not exist.

- [ ] **Step 3: Implement the card view model**

```js
export function roundOneCards(domains, domainStates, technical) {
  return domains.flatMap((domain) => domain.slug === 'technical'
    ? domain.tracks.map((track) => ({
        key: `technical:${track.id}`,
        kind: 'technical',
        title: track.name,
        subtitle: 'Technical assessment',
        status: technical.complete ? 'submitted' : 'not_started',
        subdomainId: track.id,
      }))
    : [{
        key: `written:${domain.id}`,
        kind: 'written',
        title: domain.name,
        subtitle: domain.tracks.map((track) => track.name).join(' · ') || 'Whole-domain application',
        status: domainStates[domain.id]?.status || 'not_started',
        domainId: domain.id,
      }]);
}
```

- [ ] **Step 4: Replace the long form with hub/workspace rendering**

Add `activeDomainId` state. When it is null, render a responsive card grid with status labels and buttons. Written cards set `activeDomainId`; Technical cards link to `/dashboard/assessment?track=${card.subdomainId}`.

When `activeDomainId` is set, render only that domain's questions. Build PUT and POST payloads from only that domain:

```ts
const domainPayload = (domainId: string) => ({
  domainId,
  answers: data.questions
    .filter((question) => question.domainId === domainId)
    .map((question) => ({
      domainId,
      questionId: question.id,
      answerText: drafts[question.answerKey]?.answerText ?? '',
      submissionLinks: drafts[question.answerKey]?.submissionLinks ?? [],
    })),
});
```

Save draft and Submit domain act only on the active domain. Submitted domains disable their controls. Back to Round 1 saves dirty active-domain drafts before returning to the card grid. Keep the Design two-of-three counter inside the Design workspace.

In `assessment/page.tsx`, read `track` with `useSearchParams()`. After questions load, find the first question whose `subdomain_id` equals the requested UUID and set `currentIdx` to that index. An invalid or absent hint keeps the current first-question behavior.

- [ ] **Step 5: Verify tests and build**

Run: `npm --prefix recruitment test`

Expected: all tests pass.

Run: `npm --prefix recruitment run build`

Expected: all routes compile and type checking succeeds.

- [ ] **Step 6: Commit the candidate workflow**

```bash
git add recruitment/src/app/dashboard/round-1/page.tsx recruitment/src/app/dashboard/assessment/page.tsx recruitment/src/lib/round-one-hub-rules.mjs recruitment/src/lib/round-one-hub-rules.test.mjs
git commit -m "feat: add Round 1 domain workspace hub"
```

---

### Task 4: Josefin Sans across every admin route

**Files:**
- Modify: `recruitment/src/app/globals.css`
- Modify: `recruitment/src/app/admin/layout.tsx`
- Create: `recruitment/src/app/admin/admin-font.contract.test.mjs`

**Interfaces:**
- Produces: `.admin-font` scope that forces Josefin Sans for all descendants of the admin layout.
- Consumes: the existing admin layout early-return branches for login, loading, Operations, and standard navigation.

- [ ] **Step 1: Write the failing admin-font contract test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../globals.css', import.meta.url), 'utf8');
const layout = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');

test('loads Josefin Sans and scopes it to every admin layout branch', () => {
  assert.match(css, /family=Josefin\+Sans/);
  assert.match(css, /\.admin-font[^{]*\{[^}]*font-family:\s*'Josefin Sans'/s);
  assert.match(css, /\.admin-font \.font-mono/);
  assert.match(layout, /className="admin-font/);
  assert.doesNotMatch(layout, /if \(isLoginPage\) return children/);
  assert.doesNotMatch(layout, /if \(isOperationsPage\) return children/);
});
```

- [ ] **Step 2: Run the contract test and verify RED**

Run: `npm --prefix recruitment test -- src/app/admin/admin-font.contract.test.mjs`

Expected: FAIL because Josefin Sans and `.admin-font` do not exist.

- [ ] **Step 3: Add the admin-only font scope**

Extend the first CSS import with `family=Josefin+Sans:wght@300;400;500;600;700`. Add:

```css
.admin-font,
.admin-font h1,
.admin-font h2,
.admin-font h3,
.admin-font a,
.admin-font button,
.admin-font input,
.admin-font select,
.admin-font textarea,
.admin-font .font-mono,
.admin-font .font-display {
  font-family:'Josefin Sans',sans-serif;
}
```

Wrap every admin layout return branch in an element whose class begins with `admin-font`, including login, loading, Operations, and the standard sidebar layout. Do not place the class on the root application body.

- [ ] **Step 4: Verify the contract, full suite, and build**

Run: `npm --prefix recruitment test -- src/app/admin/admin-font.contract.test.mjs`

Expected: contract test passes.

Run: `npm --prefix recruitment test`

Expected: all tests pass.

Run: `npm --prefix recruitment run build`

Expected: Next.js compilation and type checking complete successfully.

- [ ] **Step 5: Commit the typography change**

```bash
git add recruitment/src/app/globals.css recruitment/src/app/admin/layout.tsx recruitment/src/app/admin/admin-font.contract.test.mjs
git commit -m "style: use Josefin Sans across admin pages"
```

---

### Task 5: End-to-end verification and documentation

**Files:**
- Modify: `recruitment/README.md`

**Interfaces:**
- Documents: separate domain submission behavior and the combined Technical-card behavior.
- Verifies: candidate hub, focused workspace, independent finality, Technical deep link, admin typography, responsive layout.

- [ ] **Step 1: Update the workflow documentation**

Add this behavior under the candidate flow section:

```md
- Round 1 opens as a card hub: one card per selected non-Technical domain and one entry card per selected Technical subdomain.
- Written domains save and submit independently. Submitting one domain locks only that domain.
- Technical cards open the relevant tab inside the candidate's single combined timed assessment.
```

State under admin behavior that all `/admin` routes use Josefin Sans.

- [ ] **Step 2: Run fresh automated verification**

Run: `npm --prefix recruitment test`

Expected: zero failed tests.

Run: `npm --prefix recruitment run build`

Expected: production build exits successfully.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 3: Verify the running application in the browser**

Start or reuse `npm --prefix recruitment run dev`. Sign in with a test candidate that has at least two non-Technical domains and one Technical subdomain selected.

Verify:

1. `/dashboard/round-1` initially displays cards and no expanded question list.
2. Opening Finance displays only Finance questions.
3. Saving Finance changes only the Finance card to Draft.
4. Submitting Finance changes only Finance to Submitted and locks its inputs.
5. Another written domain remains editable and independently submittable.
6. A Technical card opens `/dashboard/assessment?track=<selected-id>` on the matching tab.
7. The hub and workspace remain readable at desktop and narrow viewport widths.
8. `/admin/login` and `/admin/operations` visibly use Josefin Sans.
9. Browser console contains no application errors.

- [ ] **Step 4: Commit documentation**

```bash
git add recruitment/README.md
git commit -m "docs: explain independent Round 1 submissions"
```

- [ ] **Step 5: Report evidence**

Report the exact test count, production build result, browser routes checked, and any remaining external configuration requirement. Do not describe the work as complete unless all required checks passed.
