import fs from 'fs';
import path from 'path';
import { SEED_QUESTIONS, SEED_GUIDELINES, SEED_PROJECTS } from './seed-data';

export interface LocalProject {
  id: string;
  subdomain_id: string;
  title: string;
  details: string;
  aws_services?: string[];
  created_at: string;
}

export interface LocalQuestion {
  id: string;
  domain_id?: string;
  subdomain_id: string;
  question_text: string;
  question_type: 'mcq' | 'multiple_select' | 'short_answer';
  options: { id: string; text: string }[] | null;
  correct_answers: string[];
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  is_active: boolean;
  created_at: string;
}

export interface LocalGuideline {
  subdomain_id: string;
  round_number: number;
  guidelines: string;
  updated_at: string;
  updated_by?: string;
}

export interface LocalWrittenQuestion {
  id: string;
  scope: 'common_non_technical' | 'domain';
  domain_id: string | null;
  question_group: string;
  prompt: string;
  instructions: string;
  response_type: 'long_text' | 'long_text_with_links';
  required: boolean;
  sort_order: number;
  is_active: boolean;
  minimum_answers?: number | null;
  created_at: string;
}

interface LocalStoreData {
  questions: LocalQuestion[];
  written_questions: LocalWrittenQuestion[];
  guidelines: LocalGuideline[];
  projects: LocalProject[];
}

const STORE_PATH = path.join(process.cwd(), 'data', 'local-recruitment-store.json');

function ensureStoreExists(): LocalStoreData {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    const initial: LocalStoreData = {
      questions: SEED_QUESTIONS,
      written_questions: [],
      guidelines: SEED_GUIDELINES,
      projects: SEED_PROJECTS,
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const content = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(content) as LocalStoreData;
    let modified = false;
    if (!parsed.questions || parsed.questions.length === 0) {
      parsed.questions = SEED_QUESTIONS;
      modified = true;
    }
    if (!parsed.guidelines || parsed.guidelines.length === 0) {
      parsed.guidelines = SEED_GUIDELINES;
      modified = true;
    }
    if (!parsed.projects || parsed.projects.length === 0) {
      parsed.projects = SEED_PROJECTS;
      modified = true;
    }
    if (modified) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch {
    const fallback: LocalStoreData = {
      questions: SEED_QUESTIONS,
      written_questions: [],
      guidelines: SEED_GUIDELINES,
      projects: SEED_PROJECTS,
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function writeStore(data: LocalStoreData) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export const localStore = {
  getQuestions(subdomainId?: string | null): LocalQuestion[] {
    const data = ensureStoreExists();
    if (!subdomainId) return data.questions;
    return data.questions.filter((q) => q.subdomain_id === subdomainId);
  },

  addQuestion(question: Omit<LocalQuestion, 'id' | 'created_at'> & { id?: string }): LocalQuestion {
    const data = ensureStoreExists();
    const item: LocalQuestion = {
      ...question,
      id: question.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    data.questions.unshift(item);
    writeStore(data);
    return item;
  },

  deleteQuestion(id: string): boolean {
    const data = ensureStoreExists();
    const initialLen = data.questions.length;
    data.questions = data.questions.filter((q) => q.id !== id);
    if (data.questions.length !== initialLen) {
      writeStore(data);
      return true;
    }
    return false;
  },

  clearQuestions(subdomainId: string): void {
    const data = ensureStoreExists();
    data.questions = data.questions.filter((q) => q.subdomain_id !== subdomainId);
    writeStore(data);
  },

  getWrittenQuestions(domainId?: string | null): LocalWrittenQuestion[] {
    const data = ensureStoreExists();
    if (!domainId) return data.written_questions || [];
    return (data.written_questions || []).filter(
      (q) => q.domain_id === domainId || q.scope === 'common_non_technical'
    );
  },

  addWrittenQuestion(question: Omit<LocalWrittenQuestion, 'id' | 'created_at'> & { id?: string }): LocalWrittenQuestion {
    const data = ensureStoreExists();
    if (!data.written_questions) data.written_questions = [];
    const item: LocalWrittenQuestion = {
      ...question,
      id: question.id || `wq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    data.written_questions.unshift(item);
    writeStore(data);
    return item;
  },

  deleteWrittenQuestion(id: string): boolean {
    const data = ensureStoreExists();
    if (!data.written_questions) return false;
    const initialLen = data.written_questions.length;
    data.written_questions = data.written_questions.filter((q) => q.id !== id);
    if (data.written_questions.length !== initialLen) {
      writeStore(data);
      return true;
    }
    return false;
  },

  clearWrittenQuestions(domainId?: string): void {
    const data = ensureStoreExists();
    if (!data.written_questions) return;
    if (domainId) {
      data.written_questions = data.written_questions.filter((q) => q.domain_id !== domainId);
    } else {
      data.written_questions = [];
    }
    writeStore(data);
  },

  getGuidelines(subdomainId: string, roundNumber?: number): LocalGuideline[] {
    const data = ensureStoreExists();
    return data.guidelines.filter(
      (g) => g.subdomain_id === subdomainId && (!roundNumber || g.round_number === roundNumber)
    );
  },

  saveGuideline(guideline: LocalGuideline): LocalGuideline {
    const data = ensureStoreExists();
    data.guidelines = data.guidelines.filter(
      (g) => !(g.subdomain_id === guideline.subdomain_id && g.round_number === guideline.round_number)
    );
    data.guidelines.push(guideline);
    writeStore(data);
    return guideline;
  },

  getProjects(subdomainId?: string | null): LocalProject[] {
    const data = ensureStoreExists();
    if (!subdomainId) return data.projects;
    return data.projects.filter((p) => p.subdomain_id === subdomainId);
  },

  saveProject(project: Omit<LocalProject, 'id' | 'created_at'> & { id?: string }): LocalProject {
    const data = ensureStoreExists();
    const item: LocalProject = {
      ...project,
      id: project.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    data.projects.unshift(item);
    writeStore(data);
    return item;
  },

  deleteProject(id: string): boolean {
    const data = ensureStoreExists();
    const initialLen = data.projects.length;
    data.projects = data.projects.filter((p) => p.id !== id);
    if (data.projects.length !== initialLen) {
      writeStore(data);
      return true;
    }
    return false;
  },

  clearProjects(subdomainId: string): void {
    const data = ensureStoreExists();
    data.projects = data.projects.filter((p) => p.subdomain_id !== subdomainId);
    writeStore(data);
  },
};
