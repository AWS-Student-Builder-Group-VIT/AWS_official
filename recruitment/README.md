# AWS-SBG Recruitment Platform

A Next.js 14 recruitment portal backed by Supabase Auth and Postgres. It runs as the recruitment experience for the AWS Student Builder Group VIT Vellore website.

## Local setup

1. Create or select the Supabase project.
2. Run `supabase/schema.sql`, then every SQL file in `supabase/migrations/` in filename order.
3. In particular, run `202609150001_domain_round1_redesign.sql` after `202609140008_round_content_and_identity.sql`. The latest migration is idempotent and can safely be run again.
4. Enable Google under Supabase Authentication → Providers.
5. Add `http://localhost:3001/auth/callback` and the production callback URL to the Supabase and Google OAuth redirect allow lists.
6. Copy `.env.example` to `.env.local` and fill in the Supabase values. `ALLOWED_EMAIL_DOMAINS` accepts a comma-separated allow list; leave it blank while testing personal Google accounts.
7. Run `npm ci`, followed by `npm run dev`.

Google OAuth callbacks:

- Local: `http://localhost:3001/auth/callback`
- Production: `https://YOUR_RECRUITMENT_DOMAIN/auth/callback`

## Active application taxonomy

Candidates may apply to any domain. Technical is optional; when selected, it permits at most two Technical specializations. There is no overall maximum and no maximum for non-Technical selections.

- Technical
  - Web Development
  - App Development
  - Game Development
  - AI/ML
- Events
  - Operations & Execution
  - Logistics and Participant Management
  - Event Ideation and Planning
- Design
  - Digital Graphic Design
  - Art & Craft / Physical Design
  - UI/UX Design
- Publicity
  - Social Media Management
  - Content & Video Editing
  - Event Promotion
- Outreach — selected as a whole domain
- Finance — selected as a whole domain

Finance and Outreach use hidden compatibility tracks internally so existing project and interview foreign keys remain valid. Candidate screens and exports display only the whole-domain names.

## Recruitment flow

Profile completion collects registration number, phone number, year, and branch. GitHub, LinkedIn, and portfolio fields are not requested.

Saving domain choices routes directly to `/dashboard/round-1`.

Every selected non-Technical domain receives these required prompts once per domain:

1. Why do you want to join this club?
2. Tell us about your previous work in detail under this domain.

Design also includes three handbook tasks. Candidates must submit any two:

- Core and Board merchandise
- HackQuest landing page
- Three-grid Instagram event post

Design tasks accept a detailed explanation and shareable links. Direct file upload is intentionally not part of this version. Additional domain-specific written question sets can be added later from the admin Question Bank without changing candidate code.

Technical selections use the scored assessment component of Round 1: five questions and 25 minutes per selected Technical specialization. Projects remain Round 2, and interviews remain Round 3.

## Admin testing and operations

While running `npm run dev`, open `/admin/login` and choose **Enter local admin**. This development-only shortcut is unavailable in production builds.

The operations console at `/admin/operations` provides:

- Candidate search plus independent domain, subdomain, stage, and score filters
- Every application choice without primary/secondary assumptions
- Written-response and Design-link review in the candidate dossier
- Technical assessment results and mark release controls
- Project, interview, and final-decision review
- CSV export containing every choice and written response
- Separate question-management modes for Technical scored questions and non-Technical written questions

The Domains page displays `subdomains` versus `whole_domain` selection mode and does not expose synthetic Finance/Outreach tracks as candidate choices.

## Bootstrap the first administrator

Sign in with Google once, then run this in the Supabase SQL editor using the authenticated user's UUID from Authentication → Users:

```sql
insert into public.admin_users (id, email, name, role)
values ('AUTH_USER_UUID', 'admin@example.com', 'Admin Name', 'super_admin');
```

Sign out and back in, then open `/admin`.

## Security model

- Candidates can access only their own profile, selections, attempts, answers, submissions, bookings, notifications, and results through RLS.
- Candidate written answers are keyed by candidate, selected domain, and question.
- Technical answer keys are never returned to candidate clients.
- Assessment attempts and grading are created and processed server-side.
- Admin access is checked against `admin_users`.
- The Supabase service-role key must remain server-only and must never use a `NEXT_PUBLIC_` prefix.

## Verification

Run from the repository root:

```bash
npm --prefix recruitment test
npm --prefix recruitment run build
npm run build
```

Live OAuth, RLS, candidate submission, and admin dossier checks require the configured Supabase project to have the latest migration applied.
