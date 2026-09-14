export type QuestionType = 'mcq' | 'multiple_select' | 'short_answer' | 'code' | 'scenario';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type RoundStatus = 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'qualified' | 'not_qualified';
export type CandidateStatus = 'pending' | 'round_0' | 'round_1' | 'round_2' | 'selected' | 'waitlisted' | 'rejected';
export type FinalResult = 'selected' | 'waitlisted' | 'not_selected';

export interface Domain {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  is_active: boolean;
  sort_order?: number;
  selection_mode?: 'subdomains' | 'whole_domain';
  subdomains?: Subdomain[];
}

export interface Subdomain {
  id: string;
  domain_id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  is_active: boolean;
  sort_order?: number;
}

export interface SubdomainRoundGuideline {
  subdomain_id: string;
  round_number: 2 | 3;
  guidelines: string;
  updated_at?: string;
  updated_by?: string;
}

export interface CandidateProfile {
  id: string;
  full_name: string;
  registration_number: string;
  email: string;
  phone?: string;
  year?: number;
  branch?: string;
  avatar_url?: string;
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  profile_complete?: boolean;
  domain_id?: string;
  subdomain_id?: string;
  domain_locked: boolean;
  current_round: number;
  status: CandidateStatus;
  round_0_status: RoundStatus;
  round_0_score?: number;
  round_1_status: RoundStatus;
  round_1_score?: number;
  interview_status: RoundStatus;
  final_status?: FinalResult;
  created_at: string;
  updated_at: string;
  domain?: Domain;
  subdomain?: Subdomain;
  subdomain_choices?: CandidateSubdomainChoice[];
}

export interface CandidateSubdomainChoice {
  candidate_id: string;
  subdomain_id: string;
  priority: number;
  created_at?: string;
  updated_at?: string;
  subdomain?: Subdomain & { domain?: Domain };
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface AssessmentQuestion {
  id: string;
  domain_id: string;
  subdomain_id?: string;
  question_text: string;
  question_type: QuestionType;
  options?: QuestionOption[];
  correct_answers?: string[];
  marks: number;
  difficulty: DifficultyLevel;
  explanation?: string;
}

export interface AssessmentAttempt {
  id: string;
  candidate_id: string;
  domain_id: string;
  subdomain_id?: string;
  question_ids: string[];
  started_at: string;
  submitted_at?: string;
  time_limit_seconds: number;
  auto_submitted: boolean;
  score?: number;
  total_marks?: number;
  status: string;
  admin_qualified?: boolean;
  admin_notes?: string;
  results_released_at?: string;
  results_released_by?: string;
}

export interface AssessmentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: string | string[];
  saved_at: string;
}

export interface Project {
  id: string;
  domain_id: string;
  subdomain_id?: string;
  code: string;
  title: string;
  problem_statement: string;
  requirements: string;
  aws_services: string[];
  optional_features?: string;
  evaluation_rubric?: Record<string, number>;
  deadline_days: number;
  difficulty: DifficultyLevel;
}

export interface ProjectAssignment {
  id: string;
  candidate_id: string;
  subdomain_id?: string;
  project_id: string;
  assigned_at: string;
  deadline: string;
  status: string;
  project?: Project;
}

export interface ProjectSubmission {
  id: string;
  assignment_id: string;
  candidate_id: string;
  github_url: string;
  deployed_url?: string;
  demo_video_url?: string;
  notes?: string;
  aws_services_used?: string[];
  hardest_problem?: string;
  improvements?: string;
  submitted_at: string;
  is_late: boolean;
}

export interface ProjectEvaluation {
  id: string;
  submission_id: string;
  candidate_id: string;
  technical_score?: number;
  problem_solving_score?: number;
  aws_score?: number;
  code_quality_score?: number;
  ux_score?: number;
  documentation_score?: number;
  total_score?: number;
  comments?: string;
  qualified?: boolean;
  evaluated_at: string;
}

export interface InterviewDate {
  id: string;
  domain_id: string;
  subdomain_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  location?: string;
  meeting_link?: string;
  interviewers?: string[];
  slots?: InterviewSlot[];
}

export interface InterviewSlot {
  id: string;
  date_id: string;
  slot_time: string;
  is_booked: boolean;
  date?: InterviewDate;
}

export interface InterviewBooking {
  id: string;
  candidate_id: string;
  subdomain_id?: string;
  slot_id: string;
  booking_ref: string;
  booked_at: string;
  status: string;
  slot?: InterviewSlot;
}

export interface FinalResultRecord {
  id: string;
  candidate_id: string;
  result: FinalResult;
  feedback?: string;
  announced_at: string;
}

export type SavedAnswers = Record<string, string | string[]>;
