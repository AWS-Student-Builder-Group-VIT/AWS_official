import fs from 'fs';
import path from 'path';

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

interface LocalStoreData {
  questions: LocalQuestion[];
  written_questions: any[];
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
      questions: [],
      written_questions: [],
      guidelines: [],
      projects: [],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const content = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    const fallback: LocalStoreData = {
      questions: [],
      written_questions: [],
      guidelines: [],
      projects: [],
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
