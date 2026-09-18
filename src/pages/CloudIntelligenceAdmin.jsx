import { useState, useEffect, useMemo } from 'react';
import {
  fetchCloudIntelligenceQuestions,
  createCloudIntelligenceQuestion,
  updateCloudIntelligenceQuestion,
  deleteCloudIntelligenceQuestion,
  fetchCloudIntelligenceSettings,
  updateCloudIntelligenceSettings,
  toggleCloudIntelligenceFreeze,
  fetchCloudIntelligenceResults,
  deleteCloudIntelligenceResult,
  resetCloudIntelligenceResults,
  releaseCloudIntelligenceResults,
  updateCloudIntelligenceSubmission,
} from '../utils/auth';

const QUESTION_TYPES = [
  { id: 'mcq', label: 'Single Choice (MCQ)', icon: 'radio_button_checked', color: '#00a8e0', bg: 'rgba(0,168,224,0.15)', border: 'rgba(0,168,224,0.4)' },
  { id: 'assertion_reason', label: 'Assertion & Reason', icon: 'compare_arrows', color: '#c084fc', bg: 'rgba(192,132,252,0.15)', border: 'rgba(192,132,252,0.4)' },
  { id: 'multi_select', label: 'Multi-Select (Choosables)', icon: 'check_box', color: '#a8e063', bg: 'rgba(168,224,99,0.15)', border: 'rgba(168,224,99,0.4)' },
  { id: 'objective', label: 'Objective / Short Answer', icon: 'edit_note', color: '#FF9900', bg: 'rgba(255,153,0,0.15)', border: 'rgba(255,153,0,0.4)' },
];

const DIFFICULTY_LEVELS = [
  { id: 'easy', label: 'Easy', color: '#34d399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.4)' },
  { id: 'medium', label: 'Medium', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)' },
  { id: 'hard', label: 'Hard', color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.4)' },
];

// Time allowed per question: 0.5 minutes. Keep in step with the server.
const SECONDS_PER_QUESTION = 30;
const MINUTES_PER_QUESTION = SECONDS_PER_QUESTION / 60;

const DEFAULT_ASSERTION_REASON_OPTIONS = [
  'Both Assertion (A) and Reason (R) are true, and (R) is the correct explanation of (A).',
  'Both Assertion (A) and Reason (R) are true, but (R) is NOT the correct explanation of (A).',
  'Assertion (A) is true, but Reason (R) is false.',
  'Assertion (A) is false, but Reason (R) is true.',
];

export default function CloudIntelligenceAdmin({ token }) {
  const [subTab, setSubTab] = useState('questions'); // 'questions' | 'results' | 'settings'

  // Questions State
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionSearch, setQuestionSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  // Question Modal State (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Confirmation Modals (Questions & Submissions)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteSubmissionConfirm, setDeleteSubmissionConfirm] = useState(null);

  // Settings & Freeze State
  const [settings, setSettings] = useState({
    status: 'unfrozen',
    title: 'AWS Cloud Intelligence Assessment',
    duration_minutes: 30,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Results State
  const [submissions, setSubmissions] = useState([]);
  const [resultStats, setResultStats] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultSearch, setResultSearch] = useState('');
  const [viewSubmissionModal, setViewSubmissionModal] = useState(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Review & Edit Submission State
  const [reviewItems, setReviewItems] = useState([]);
  const [selectedAddQuestionId, setSelectedAddQuestionId] = useState('');
  const [savingSubmission, setSavingSubmission] = useState(false);
  const [reviewModalError, setReviewModalError] = useState('');

  const checkAnswerCorrect = (qType, uAns, cAns) => {
    if (uAns === undefined || uAns === null || uAns === '' || (Array.isArray(uAns) && uAns.length === 0)) {
      return false;
    }
    if (qType === 'mcq' || qType === 'assertion_reason') {
      const cText = typeof cAns === 'object' && cAns !== null ? JSON.stringify(cAns) : String(cAns || '').trim();
      const uText = typeof uAns === 'object' && uAns !== null ? JSON.stringify(uAns) : String(uAns || '').trim();
      return cText.toLowerCase() === uText.toLowerCase();
    }
    if (qType === 'multi_select') {
      const cArr = Array.isArray(cAns) ? cAns.map(s => String(s).trim().toLowerCase()).sort() : [];
      const uArr = Array.isArray(uAns) ? uAns.map(s => String(s).trim().toLowerCase()).sort() : [];
      return cArr.length > 0 && cArr.length === uArr.length && cArr.every((v, i) => v === uArr[i]);
    }
    if (qType === 'objective') {
      const clean = String(uAns || '').trim().toLowerCase();
      if (Array.isArray(cAns)) {
        return cAns.some(a => String(a).trim().toLowerCase() === clean);
      }
      return clean === String(cAns || '').trim().toLowerCase();
    }
    return false;
  };

  const handleOpenReviewModal = (sub) => {
    const qMap = new Map((questions || []).map(q => [q.id, q]));
    const breakdown = Array.isArray(sub.breakdown) ? sub.breakdown : [];
    const items = breakdown.map((item) => {
      const q = qMap.get(item.questionId) || {};
      return {
        questionId: item.questionId,
        difficulty: q.difficulty || item.difficulty || 'medium',
        isAnswered: Boolean(item.isAnswered),
        isCorrect: Boolean(item.isCorrect),
        userAnswer: item.userAnswer ?? sub.answers?.[item.questionId] ?? null,
        correctAnswer: q.correct_answer !== undefined ? q.correct_answer : item.correctAnswer,
        questionText: q.question_text || (q.assertion ? `Assertion: ${q.assertion}` : `Question #${item.questionId}`),
        questionType: q.question_type || 'mcq',
        assertion: q.assertion || null,
        reason: q.reason || null,
        options: Array.isArray(q.options) ? q.options : [],
      };
    });

    setReviewItems(items);
    setSelectedAddQuestionId('');
    setReviewModalError('');
    setViewSubmissionModal(sub);
  };

  const handleUpdateItemAnswer = (index, newAnswer) => {
    setReviewItems(prev => {
      const next = [...prev];
      const item = { ...next[index] };
      const isAnswered = newAnswer !== null && newAnswer !== undefined && newAnswer !== '' && !(Array.isArray(newAnswer) && newAnswer.length === 0);
      item.userAnswer = isAnswered ? newAnswer : null;
      item.isAnswered = isAnswered;
      item.isCorrect = checkAnswerCorrect(item.questionType, newAnswer, item.correctAnswer);
      next[index] = item;
      return next;
    });
  };

  const handleToggleMultiSelectOption = (index, option) => {
    setReviewItems(prev => {
      const next = [...prev];
      const item = { ...next[index] };
      const currentList = Array.isArray(item.userAnswer) ? [...item.userAnswer] : (item.userAnswer ? [item.userAnswer] : []);
      const exists = currentList.some(v => String(v).trim().toLowerCase() === String(option).trim().toLowerCase());
      const updatedList = exists
        ? currentList.filter(v => String(v).trim().toLowerCase() !== String(option).trim().toLowerCase())
        : [...currentList, option];
      
      const isAnswered = updatedList.length > 0;
      item.userAnswer = isAnswered ? updatedList : null;
      item.isAnswered = isAnswered;
      item.isCorrect = checkAnswerCorrect(item.questionType, item.userAnswer, item.correctAnswer);
      next[index] = item;
      return next;
    });
  };

  const handleMarkCorrect = (index) => {
    setReviewItems(prev => {
      const next = [...prev];
      const item = { ...next[index] };
      let defaultCorrect = item.correctAnswer;
      if (item.questionType === 'multi_select' && !Array.isArray(defaultCorrect)) {
        defaultCorrect = defaultCorrect ? [defaultCorrect] : [];
      } else if (item.questionType === 'objective' && Array.isArray(defaultCorrect)) {
        defaultCorrect = defaultCorrect[0] || '';
      }
      item.userAnswer = defaultCorrect;
      item.isAnswered = true;
      item.isCorrect = true;
      next[index] = item;
      return next;
    });
  };

  const handleMarkIncorrect = (index) => {
    setReviewItems(prev => {
      const next = [...prev];
      const item = { ...next[index] };
      item.isCorrect = false;
      next[index] = item;
      return next;
    });
  };

  const handleClearAnswer = (index) => {
    setReviewItems(prev => {
      const next = [...prev];
      const item = { ...next[index] };
      item.userAnswer = null;
      item.isAnswered = false;
      item.isCorrect = false;
      next[index] = item;
      return next;
    });
  };

  const handleAddQuestionToSubmission = () => {
    if (!selectedAddQuestionId) return;
    const q = questions.find(item => String(item.id) === String(selectedAddQuestionId));
    if (!q) return;
    if (reviewItems.some(it => String(it.questionId) === String(q.id))) {
      showToast('This question is already in the submission list.', 'error');
      return;
    }
    const newItem = {
      questionId: q.id,
      difficulty: q.difficulty || 'medium',
      isAnswered: false,
      isCorrect: false,
      userAnswer: null,
      correctAnswer: q.correct_answer,
      questionText: q.question_text || (q.assertion ? `Assertion: ${q.assertion}` : `Question #${q.id}`),
      questionType: q.question_type || 'mcq',
      assertion: q.assertion || null,
      reason: q.reason || null,
      options: Array.isArray(q.options) ? q.options : [],
    };
    setReviewItems(prev => [...prev, newItem]);
    setSelectedAddQuestionId('');
    showToast('Question added to submission breakdown.');
  };

  const handleRemoveQuestionFromSubmission = (index) => {
    setReviewItems(prev => prev.filter((_, i) => i !== index));
    showToast('Question removed from submission breakdown.');
  };

  const handleSaveSubmission = async () => {
    if (!viewSubmissionModal) return;
    setSavingSubmission(true);
    setReviewModalError('');
    try {
      const itemsPayload = reviewItems.map(it => ({
        questionId: it.questionId,
        difficulty: it.difficulty,
        isAnswered: it.isAnswered,
        isCorrect: it.isCorrect,
        userAnswer: it.userAnswer,
        correctAnswer: it.correctAnswer,
        questionType: it.questionType,
      }));

      const res = await updateCloudIntelligenceSubmission(token, viewSubmissionModal.id, itemsPayload);
      if (res.ok && res.submission) {
        setSubmissions(prev => prev.map(s => s.id === res.submission.id ? res.submission : s));
        showToast('✓ Submission answers updated & score recalculated!');
        setViewSubmissionModal(null);
        void loadResults();
      } else {
        setReviewModalError(res.error || 'Failed to save submission changes');
      }
    } catch (err) {
      setReviewModalError(err.message || 'An unexpected error occurred');
    } finally {
      setSavingSubmission(false);
    }
  };

  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load Data ────────────────────────────────────────────────
  const loadQuestions = async () => {
    setLoadingQuestions(true);
    const res = await fetchCloudIntelligenceQuestions(token);
    if (res.ok) setQuestions(res.questions);
    setLoadingQuestions(false);
  };

  const loadSettings = async () => {
    const res = await fetchCloudIntelligenceSettings(token);
    if (res.ok) setSettings((prev) => ({ ...prev, ...res.settings }));
  };

  const loadResults = async () => {
    setLoadingResults(true);
    const res = await fetchCloudIntelligenceResults(token);
    if (res.ok) {
      setSubmissions(res.submissions);
      setResultStats(res.stats);
    }
    setLoadingResults(false);
  };

  useEffect(() => {
    loadQuestions();
    loadSettings();
    loadResults();
  }, [token]);

  // ── Freeze / Unfreeze Toggle ─────────────────────────────────
  const handleToggleFreeze = async () => {
    const newStatus = settings.status === 'unfrozen' ? 'frozen' : 'unfrozen';
    const res = await toggleCloudIntelligenceFreeze(token, newStatus);
    if (res.ok) {
      setSettings((prev) => ({ ...prev, status: newStatus }));
      showToast(newStatus === 'unfrozen' ? '⚡ Quiz is now UNFROZEN (Live for students)' : '🔒 Quiz is now FROZEN (Locked)');
    } else {
      showToast(res.error || 'Failed to update freeze status', 'error');
    }
  };

  // ── Show / Hide Results For Participants ─────────────────────
  const handleToggleResults = async () => {
    const next = !settings.results_released;
    const res = await releaseCloudIntelligenceResults(token, next);
    if (res.ok) {
      setSettings((prev) => ({ ...prev, results_released: next }));
      showToast(next ? 'Results are now visible to participants' : 'Results are hidden from participants');
    } else {
      showToast(res.error || 'Failed to update result visibility', 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    const res = await updateCloudIntelligenceSettings(token, {
      title: settings.title,
      duration_minutes: settings.duration_minutes,
    });
    setSavingSettings(false);
    if (res.ok) {
      showToast('Quiz configuration saved!');
    } else {
      showToast(res.error || 'Failed to save settings', 'error');
    }
  };

  // ── Question Form Initialization ─────────────────────────────
  const [formState, setFormState] = useState({
    question_type: 'mcq',
    difficulty: 'medium',
    question_text: '',
    assertion: '',
    reason: '',
    options: ['', '', '', ''],
    correct_answer: 0,
  });

  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormState({
      question_type: 'mcq',
      difficulty: 'medium',
      question_text: '',
      assertion: '',
      reason: '',
      options: ['', '', '', ''],
      correct_answer: 0,
    });
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    let initialCorrect = q.correct_answer;
    let initialOptions = Array.isArray(q.options) ? [...q.options] : [];

    if (q.question_type === 'mcq') {
      if (typeof initialCorrect === 'string') {
        const foundIdx = initialOptions.indexOf(initialCorrect);
        initialCorrect = foundIdx !== -1 ? foundIdx : 0;
      }
      while (initialOptions.length < 4) initialOptions.push('');
    } else if (q.question_type === 'assertion_reason') {
      initialOptions = initialOptions.length ? initialOptions : [...DEFAULT_ASSERTION_REASON_OPTIONS];
      if (typeof initialCorrect === 'string') {
        const foundIdx = initialOptions.indexOf(initialCorrect);
        initialCorrect = foundIdx !== -1 ? foundIdx : 0;
      }
    } else if (q.question_type === 'multi_select') {
      if (!Array.isArray(initialCorrect)) {
        initialCorrect = typeof initialCorrect === 'string' ? [initialCorrect] : [];
      }
      while (initialOptions.length < 4) initialOptions.push('');
    } else if (q.question_type === 'objective') {
      initialCorrect = typeof initialCorrect === 'string' ? initialCorrect : String(initialCorrect || '');
    }

    setFormState({
      question_type: q.question_type || 'mcq',
      difficulty: q.difficulty || 'medium',
      question_text: q.question_text || '',
      assertion: q.assertion || '',
      reason: q.reason || '',
      options: initialOptions,
      correct_answer: initialCorrect,
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setSavingQuestion(true);
    setModalError('');

    if (formState.question_type === 'assertion_reason') {
      if (!formState.assertion.trim() || !formState.reason.trim()) {
        setModalError('Both Assertion and Reason statements are required.');
        setSavingQuestion(false);
        return;
      }
    } else {
      if (!formState.question_text.trim()) {
        setModalError('Question statement is required.');
        setSavingQuestion(false);
        return;
      }
    }

    const payload = {
      question_type: formState.question_type,
      difficulty: formState.difficulty,
      question_text: formState.question_text.trim(),
      assertion: formState.assertion.trim(),
      reason: formState.reason.trim(),
    };

    if (formState.question_type === 'mcq') {
      const validOptions = formState.options.map((o) => String(o).trim()).filter(Boolean);
      if (validOptions.length < 2) {
        setModalError('Please provide at least 2 options for MCQ.');
        setSavingQuestion(false);
        return;
      }
      payload.options = validOptions;
      const selectedOptionIdx = Number(formState.correct_answer) || 0;
      payload.correct_answer = validOptions[selectedOptionIdx] !== undefined ? validOptions[selectedOptionIdx] : validOptions[0];
    } else if (formState.question_type === 'assertion_reason') {
      const opts = [...DEFAULT_ASSERTION_REASON_OPTIONS];
      payload.options = opts;
      const idx = Number(formState.correct_answer) || 0;
      payload.correct_answer = opts[idx] ?? opts[0];
      payload.question_text = `Assertion (A): ${formState.assertion}\nReason (R): ${formState.reason}`;
    } else if (formState.question_type === 'multi_select') {
      const validOptions = formState.options.map((o) => String(o).trim()).filter(Boolean);
      if (validOptions.length < 2) {
        setModalError('Please provide at least 2 options for Multi-Select.');
        setSavingQuestion(false);
        return;
      }
      const selectedArray = Array.isArray(formState.correct_answer) ? formState.correct_answer : [];
      if (selectedArray.length === 0) {
        setModalError('Please select at least one correct option.');
        setSavingQuestion(false);
        return;
      }
      payload.options = validOptions;
      payload.correct_answer = selectedArray;
    } else if (formState.question_type === 'objective') {
      if (!String(formState.correct_answer).trim()) {
        setModalError('Correct answer text is required for objective questions.');
        setSavingQuestion(false);
        return;
      }
      payload.options = [];
      payload.correct_answer = String(formState.correct_answer).trim();
    }

    let res;
    if (editingQuestion) {
      res = await updateCloudIntelligenceQuestion(token, editingQuestion.id, payload);
    } else {
      res = await createCloudIntelligenceQuestion(token, payload);
    }

    setSavingQuestion(false);
    if (res.ok) {
      showToast(editingQuestion ? 'Question updated!' : 'Question added (1 Mark)!');
      setModalOpen(false);
      loadQuestions();
    } else {
      setModalError(res.error || 'Failed to save question.');
    }
  };

  const handleDeleteQuestion = async (id) => {
    const res = await deleteCloudIntelligenceQuestion(token, id);
    if (res.ok) {
      showToast('Question deleted.');
      setDeleteConfirmId(null);
      loadQuestions();
    } else {
      showToast(res.error || 'Failed to delete question', 'error');
    }
  };

  const handleDeleteResult = async (id) => {
    const res = await deleteCloudIntelligenceResult(token, id);
    if (res.ok) {
      showToast('Submission removed.');
      loadResults();
    } else {
      showToast(res.error || 'Failed to delete result', 'error');
    }
  };

  const handleResetAllResults = async () => {
    const res = await resetCloudIntelligenceResults(token);
    if (res.ok) {
      showToast('All quiz results have been cleared.');
      setResetConfirmOpen(false);
      loadResults();
    } else {
      showToast(res.error || 'Failed to reset results', 'error');
    }
  };

  const handleExportCSV = () => {
    if (!submissions.length) {
      showToast('No submissions to export', 'error');
      return;
    }
    const headers = ['Rank', 'Name', 'Email', 'Registration No', 'Final Score', 'Total Max Marks', 'Correctness (60%)', 'Speed (40%)', 'Time Taken (s)', 'Submitted At'];
    const rows = submissions.map((s, idx) => [
      idx + 1,
      `"${s.participant_name || ''}"`,
      `"${s.participant_email || ''}"`,
      `"${s.participant_reg_no || ''}"`,
      s.score,
      s.total_marks,
      s.accuracy_score,
      s.speed_score,
      s.time_taken_seconds,
      `"${s.submitted_at || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cloud_intelligence_winners_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Leaderboard CSV exported!');
  };

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSearch =
        (q.question_text || '').toLowerCase().includes(questionSearch.toLowerCase()) ||
        (q.assertion || '').toLowerCase().includes(questionSearch.toLowerCase());
      const matchType = typeFilter === 'all' || q.question_type === typeFilter;
      const matchDiff = difficultyFilter === 'all' || (q.difficulty || 'medium') === difficultyFilter;
      return matchSearch && matchType && matchDiff;
    });
  }, [questions, questionSearch, typeFilter, difficultyFilter]);

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const search = resultSearch.toLowerCase();
      return (
        (s.participant_name || '').toLowerCase().includes(search) ||
        (s.participant_email || '').toLowerCase().includes(search) ||
        (s.participant_reg_no || '').toLowerCase().includes(search)
      );
    });
  }, [submissions, resultSearch]);

  const totalPossiblePoints = useMemo(() => questions.length * 1.0, [questions]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 border font-mono text-sm shadow-2xl flex items-center gap-3 transition-all ${
            toast.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-200' : 'bg-[#1c1a24] border-[#FF9900]/60 text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-ping" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Top Freeze / Unfreeze Controller Bar ────────────────── */}
      <div className="bg-[#12161f] border border-white/10 p-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#FF9900]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/40">
                AWS Student Builder Group
              </span>
              <span
                className={`px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest border flex items-center gap-1.5 ${
                  settings.status === 'unfrozen'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 animate-pulse'
                    : 'bg-red-500/20 text-red-400 border-red-500/50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {settings.status === 'unfrozen' ? 'lock_open' : 'lock'}
                </span>
                {settings.status === 'unfrozen' ? 'UNFROZEN (LIVE FOR STUDENTS)' : 'FROZEN (LOCKED)'}
              </span>
            </div>
            <h2 className="font-mono text-2xl font-bold text-white tracking-wide">{settings.title}</h2>
            <p className="font-mono text-xs text-[#dbc2ad] mt-1">
              Scoring Model: <strong>1 Mark per question</strong> (0.6 Correctness + 0.4 Speed Bonus).
            </p>
          </div>

          {/* Freeze / Unfreeze + Result Visibility */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleResults}
              className={`px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border ${
                settings.results_released
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-white/15 bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Participants only see their marks and answer review once you release them"
            >
              <span className="material-symbols-outlined text-base">
                {settings.results_released ? 'visibility' : 'visibility_off'}
              </span>
              {settings.results_released ? 'Results Released (Hide)' : 'Release Results'}
            </button>
            <button
              onClick={handleToggleFreeze}
              className={`px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-lg ${
                settings.status === 'unfrozen'
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {settings.status === 'unfrozen' ? 'ac_unit' : 'lock_open'}
              </span>
              {settings.status === 'unfrozen' ? 'Freeze Quiz (Lock)' : 'Unfreeze Quiz (Allow Starts)'}
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 font-mono">
          <div className="bg-white/3 p-3 border border-white/5">
            <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block">Total Questions</span>
            <span className="text-xl font-bold text-[#FF9900]">{questions.length}</span>
          </div>
          <div className="bg-white/3 p-3 border border-white/5">
            <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block">Total Marks (1 pt/q)</span>
            <span className="text-xl font-bold text-[#a8e063]">{totalPossiblePoints.toFixed(1)} Marks</span>
          </div>
          <div className="bg-white/3 p-3 border border-white/5">
            <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block">Duration ({SECONDS_PER_QUESTION}s / Q)</span>
            <span className="text-xl font-bold text-white">{(questions.length * MINUTES_PER_QUESTION).toFixed(1)} mins</span>
          </div>
          <div className="bg-white/3 p-3 border border-white/5">
            <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block">Participants</span>
            <span className="text-xl font-bold text-[#00a8e0]">{resultStats?.total_participants || 0}</span>
          </div>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ─────────────────────────────────── */}
      <div className="flex border-b border-white/10 gap-2 font-mono text-xs">
        <button
          onClick={() => setSubTab('questions')}
          className={`px-5 py-3 border-b-2 font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
            subTab === 'questions'
              ? 'border-[#FF9900] text-[#FF9900] bg-white/5'
              : 'border-transparent text-[#dbc2ad] hover:text-white hover:bg-white/3'
          }`}
        >
          <span className="material-symbols-outlined text-sm">quiz</span>
          Question Bank ({questions.length})
        </button>

        <button
          onClick={() => setSubTab('results')}
          className={`px-5 py-3 border-b-2 font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
            subTab === 'results'
              ? 'border-[#FF9900] text-[#FF9900] bg-white/5'
              : 'border-transparent text-[#dbc2ad] hover:text-white hover:bg-white/3'
          }`}
        >
          <span className="material-symbols-outlined text-sm">emoji_events</span>
          Winners &amp; Leaderboard ({submissions.length})
        </button>

        <button
          onClick={() => setSubTab('settings')}
          className={`px-5 py-3 border-b-2 font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
            subTab === 'settings'
              ? 'border-[#FF9900] text-[#FF9900] bg-white/5'
              : 'border-transparent text-[#dbc2ad] hover:text-white hover:bg-white/3'
          }`}
        >
          <span className="material-symbols-outlined text-sm">settings</span>
          Quiz Settings
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SUB-TAB 1: QUESTION BANK
         ═══════════════════════════════════════════════════════════ */}
      {subTab === 'questions' && (
        <div className="space-y-4">
          {/* Action & Filter Toolbar */}
          <div className="bg-[#12161f] border border-white/10 p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 pl-9 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF9900]"
                />
                <span className="material-symbols-outlined text-sm text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2">
                  search
                </span>
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white/5 border border-white/10 px-3 py-2 text-xs text-[#dbc2ad] focus:outline-none focus:border-[#FF9900]"
              >
                <option value="all" className="bg-[#12161f]">All Question Types</option>
                {QUESTION_TYPES.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#12161f]">
                    {t.label}
                  </option>
                ))}
              </select>

              {/* Difficulty Filter */}
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="bg-white/5 border border-white/10 px-3 py-2 text-xs text-[#dbc2ad] focus:outline-none focus:border-[#FF9900]"
              >
                <option value="all" className="bg-[#12161f]">All Difficulties</option>
                <option value="easy" className="bg-[#12161f]">Easy</option>
                <option value="medium" className="bg-[#12161f]">Medium</option>
                <option value="hard" className="bg-[#12161f]">Hard</option>
              </select>
            </div>

            <button
              onClick={openCreateModal}
              className="w-full md:w-auto px-5 py-2.5 bg-[#FF9900] hover:bg-[#ffb86f] text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#FF9900]/20 transition-all"
            >
              <span className="material-symbols-outlined text-sm font-bold">add_circle</span>
              Add Question (1 Mark)
            </button>
          </div>

          {/* Question List */}
          {loadingQuestions ? (
            <div className="py-16 text-center font-mono text-xs text-[#dbc2ad]">
              <span className="material-symbols-outlined text-3xl animate-spin text-[#FF9900] block mb-2">sync</span>
              Loading question bank...
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-16 border border-dashed border-white/10 text-center font-mono bg-white/2 p-8">
              <span className="material-symbols-outlined text-4xl text-[#FF9900]/60 block mb-2">quiz</span>
              <p className="text-white text-sm font-bold">No Questions in Bank</p>
              <p className="text-xs text-[#dbc2ad] mt-1 mb-4">
                Click below to add questions. Each question is worth 1 Mark.
              </p>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-[#FF9900] text-black font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                + Add Question
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 font-mono">
              {filteredQuestions.map((q, idx) => {
                const typeCfg = QUESTION_TYPES.find((t) => t.id === q.question_type) || QUESTION_TYPES[0];
                const diffCfg = DIFFICULTY_LEVELS.find((d) => d.id === (q.difficulty || 'medium')) || DIFFICULTY_LEVELS[1];

                return (
                  <div
                    key={q.id}
                    className="bg-[#12161f] border border-white/10 p-5 relative group hover:border-[#FF9900]/40 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-white/50">Q{idx + 1}</span>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border flex items-center gap-1"
                          style={{ color: typeCfg.color, background: typeCfg.bg, borderColor: typeCfg.border }}
                        >
                          <span className="material-symbols-outlined text-xs">{typeCfg.icon}</span>
                          {typeCfg.label}
                        </span>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border"
                          style={{ color: diffCfg.color, background: diffCfg.bg, borderColor: diffCfg.border }}
                        >
                          ● {diffCfg.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#a8e063] bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5">
                          1.0 Mark
                        </span>

                        <button
                          onClick={() => openEditModal(q)}
                          title="Edit Question"
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs text-[#FF9900]">edit</span>
                          Edit
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(q.id)}
                          title="Delete Question"
                          className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs border border-red-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Question Statement */}
                    {q.question_type === 'assertion_reason' ? (
                      <div className="space-y-2 mb-4 bg-white/3 p-3 border border-white/5">
                        <div className="text-xs text-white">
                          <strong className="text-[#FF9900]">Assertion (A):</strong> {q.assertion}
                        </div>
                        <div className="text-xs text-white">
                          <strong className="text-[#00a8e0]">Reason (R):</strong> {q.reason}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-white font-semibold mb-3 leading-relaxed whitespace-pre-line">
                        {q.question_text}
                      </p>
                    )}

                    {/* Options Preview */}
                    {q.question_type !== 'objective' && Array.isArray(q.options) && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect =
                            Array.isArray(q.correct_answer)
                              ? q.correct_answer.includes(opt)
                              : q.correct_answer === opt || String(q.correct_answer) === String(oIdx);

                          return (
                            <div
                              key={oIdx}
                              className={`px-3 py-2 border text-xs flex items-center gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                                  : 'bg-white/2 border-white/5 text-white/70'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  isCorrect ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/50'
                                }`}
                              >
                                {isCorrect ? '✓' : String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="truncate">{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Objective Answer Preview */}
                    {q.question_type === 'objective' && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                        <span className="font-bold text-emerald-400">Accepted Answer:</span>
                        <code className="bg-black/40 px-2 py-0.5 rounded text-white">{JSON.stringify(q.correct_answer)}</code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SUB-TAB 2: WINNERS & LEADERBOARD
         ═══════════════════════════════════════════════════════════ */}
      {subTab === 'results' && (
        <div className="space-y-4 font-mono">
          {/* Results Toolbar */}
          <div className="bg-[#12161f] border border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full sm:w-80">
              <input
                type="text"
                placeholder="Search participant name, email, or reg no..."
                value={resultSearch}
                onChange={(e) => setResultSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 px-3 py-2 pl-9 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF9900]"
              />
              <span className="material-symbols-outlined text-sm text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2">
                search
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={loadResults}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">refresh</span>
                Refresh
              </button>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-[#00a8e0] hover:bg-[#00a8e0]/80 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow"
              >
                <span className="material-symbols-outlined text-xs font-bold">download</span>
                Export CSV
              </button>

              <button
                onClick={() => setResetConfirmOpen(true)}
                className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs border border-red-500/30 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">delete_sweep</span>
                Clear All
              </button>
            </div>
          </div>

          {/* Results Table */}
          {loadingResults ? (
            <div className="py-16 text-center text-xs text-[#dbc2ad]">
              <span className="material-symbols-outlined text-3xl animate-spin text-[#FF9900] block mb-2">sync</span>
              Loading leaderboard...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-16 border border-dashed border-white/10 text-center bg-white/2 p-8">
              <span className="material-symbols-outlined text-4xl text-white/20 block mb-2">emoji_events</span>
              <p className="text-white text-sm font-bold">No Submissions Recorded</p>
              <p className="text-xs text-[#dbc2ad] mt-1">
                Participant scores (0.6 Correctness + 0.4 Speed) will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="border border-white/10 bg-[#12161f] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[#dbc2ad] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Rank / Winner</th>
                    <th className="py-3 px-4">Participant</th>
                    <th className="py-3 px-4">Reg No</th>
                    <th className="py-3 px-4">Final Score</th>
                    <th className="py-3 px-4">Correctness (60%)</th>
                    <th className="py-3 px-4">Speed Bonus (40%)</th>
                    <th className="py-3 px-4">Time Taken</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {filteredSubmissions.map((sub, idx) => {
                    const rank = idx + 1;
                    const isWinner = rank <= 3;

                    return (
                      <tr key={sub.id} className={`hover:bg-white/3 transition-colors ${rank === 1 ? 'bg-amber-500/5' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                                rank === 1
                                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/40'
                                  : rank === 2
                                  ? 'bg-slate-300 text-black'
                                  : rank === 3
                                  ? 'bg-amber-700 text-white'
                                  : 'text-white/50 bg-white/5'
                              }`}
                            >
                              {rank}
                            </span>
                            {isWinner && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/40">
                                {rank === 1 ? '🥇 1st' : rank === 2 ? '🥈 2nd' : '🥉 3rd'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{sub.participant_name}</div>
                          <div className="text-[10px] text-[#dbc2ad]">{sub.participant_email}</div>
                        </td>
                        <td className="py-3 px-4 text-[#dbc2ad]">
                          <span className="bg-white/5 px-2 py-0.5 border border-white/10 text-[10px]">
                            {sub.participant_reg_no || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-base text-[#a8e063] bg-emerald-500/10 px-2.5 py-0.5 border border-emerald-500/30">
                            {sub.score} / {sub.total_marks}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#FF9900]">
                          +{sub.accuracy_score} pts
                        </td>
                        <td className="py-3 px-4 text-[#00a8e0]">
                          +{sub.speed_score} pts
                        </td>
                        <td className="py-3 px-4 text-[#dbc2ad]">
                          {Math.floor((sub.time_taken_seconds || 0) / 60)}m {(sub.time_taken_seconds || 0) % 60}s
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenReviewModal(sub)}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[#00a8e0] border border-[#00a8e0]/30 text-[10px] uppercase font-bold cursor-pointer"
                            >
                              Review
                            </button>
                            <button
                              onClick={() => setDeleteSubmissionConfirm(sub)}
                              className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-[10px] cursor-pointer"
                              title="Delete Submission"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SUB-TAB 3: QUIZ SETTINGS
         ═══════════════════════════════════════════════════════════ */}
      {subTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-[#12161f] border border-white/10 p-6 space-y-6 max-w-2xl font-mono text-xs">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-base font-bold text-white tracking-wide">Assessment Configuration</h3>
            <p className="text-[#dbc2ad] mt-1">
              Fixed system: <strong>1 Mark per question</strong> (0.6 Correctness + 0.4 Speed Bonus).
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[#dbc2ad] uppercase tracking-wider block mb-2">Quiz Title</label>
              <input
                type="text"
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                className="w-full bg-white/5 border border-white/10 px-4 py-2.5 text-white focus:outline-none focus:border-[#FF9900]"
                required
              />
            </div>

            <div className="p-4 bg-white/3 border border-white/10 space-y-2">
              <span className="text-[10px] text-[#FF9900] font-bold uppercase tracking-wider block">
                Automatic Dynamic Duration Rule
              </span>
              <p className="text-xs text-white/90">
                Duration = <strong>Total Questions × {MINUTES_PER_QUESTION} Minutes ({SECONDS_PER_QUESTION} seconds per question)</strong>.
              </p>
              <p className="text-[11px] text-[#dbc2ad]">
                Current Allotted Duration: <strong>{(questions.length * MINUTES_PER_QUESTION).toFixed(1)} Minutes ({questions.length * SECONDS_PER_QUESTION}s)</strong> for <strong>{questions.length} Question(s)</strong> in question bank.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-[#FF9900] hover:bg-[#ffb86f] text-black font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-[#FF9900]/20 transition-all disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: ADD / EDIT QUESTION BUILDER
         ═══════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12161f] border border-white/20 w-full max-w-3xl my-8 overflow-hidden shadow-2xl relative font-mono text-xs">
            <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FF9900]">
                  {editingQuestion ? 'edit_square' : 'add_circle'}
                </span>
                <h3 className="text-base font-bold text-white tracking-wide">
                  {editingQuestion ? `Edit Question #${editingQuestion.id}` : 'Create Question (1 Mark)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {modalError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>{modalError}</span>
                </div>
              )}

              {/* 1. Question Type */}
              <div>
                <label className="text-[#dbc2ad] uppercase tracking-wider block mb-2 font-bold">1. Question Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUESTION_TYPES.map((t) => {
                    const isSelected = formState.question_type === t.id;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => {
                          let newAns = formState.correct_answer;
                          let newOptions = formState.options;
                          if (t.id === 'assertion_reason') { newAns = 0; newOptions = [...DEFAULT_ASSERTION_REASON_OPTIONS]; }
                          else if (t.id === 'mcq') newAns = 0;
                          else if (t.id === 'multi_select') newAns = [];
                          else if (t.id === 'objective') newAns = '';
                          setFormState({ ...formState, question_type: t.id, options: newOptions, correct_answer: newAns });
                        }}
                        className={`p-3 border text-left cursor-pointer flex flex-col gap-1 transition-all ${
                          isSelected
                            ? 'bg-white/10 border-[#FF9900] text-white shadow-lg'
                            : 'bg-white/3 border-white/10 text-white/60 hover:bg-white/5'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base" style={{ color: t.color }}>
                          {t.icon}
                        </span>
                        <span className="font-bold text-[11px] leading-tight">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Difficulty */}
              <div>
                <label className="text-[#dbc2ad] uppercase tracking-wider block mb-2 font-bold">2. Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_LEVELS.map((d) => {
                    const isSelected = formState.difficulty === d.id;
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => setFormState({ ...formState, difficulty: d.id })}
                        className={`p-3 border text-center font-bold text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white/10 border-white text-white shadow'
                            : 'bg-white/3 border-white/10 text-white/60 hover:bg-white/5'
                        }`}
                        style={isSelected ? { color: d.color } : {}}
                      >
                        ● {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Question Statement */}
              {formState.question_type === 'assertion_reason' ? (
                <div className="space-y-3 bg-white/2 p-4 border border-white/5">
                  <div>
                    <label className="text-[#FF9900] uppercase tracking-wider block mb-1 font-bold">
                      Assertion (A) Statement *
                    </label>
                    <textarea
                      rows="2"
                      value={formState.assertion}
                      onChange={(e) => setFormState({ ...formState, assertion: e.target.value })}
                      placeholder="Enter assertion statement..."
                      className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-[#FF9900]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[#00a8e0] uppercase tracking-wider block mb-1 font-bold">
                      Reason (R) Statement *
                    </label>
                    <textarea
                      rows="2"
                      value={formState.reason}
                      onChange={(e) => setFormState({ ...formState, reason: e.target.value })}
                      placeholder="Enter reason statement..."
                      className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-[#FF9900]"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <label className="text-[#dbc2ad] uppercase tracking-wider block mb-2 font-bold">
                      Select Correct Relationship:
                    </label>
                    <div className="space-y-2">
                      {DEFAULT_ASSERTION_REASON_OPTIONS.map((optText, oIdx) => (
                        <label
                          key={oIdx}
                          className={`flex items-start gap-3 p-2.5 border cursor-pointer transition-colors ${
                            Number(formState.correct_answer) === oIdx
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                              : 'bg-white/3 border-white/5 text-white/80 hover:bg-white/5'
                          }`}
                        >
                          <input
                            type="radio"
                            name="ar_correct"
                            checked={Number(formState.correct_answer) === oIdx}
                            onChange={() => setFormState({ ...formState, correct_answer: oIdx })}
                            className="accent-emerald-500 mt-0.5 cursor-pointer"
                          />
                          <span className="leading-snug">
                            <strong>Option {String.fromCharCode(65 + oIdx)}:</strong> {optText}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[#dbc2ad] uppercase tracking-wider block mb-1 font-bold">
                    Question Statement *
                  </label>
                  <textarea
                    rows="3"
                    value={formState.question_text}
                    onChange={(e) => setFormState({ ...formState, question_text: e.target.value })}
                    placeholder="Enter question statement..."
                    className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-[#FF9900]"
                    required
                  />
                </div>
              )}

              {/* 4. Options for MCQ / Multi-Select */}
              {formState.question_type === 'mcq' && (
                <div className="space-y-2">
                  <label className="text-[#dbc2ad] uppercase tracking-wider block mb-1 font-bold">
                    Options &amp; Correct Answer (Select radio button for correct choice)
                  </label>
                  {formState.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mcq_correct"
                        checked={Number(formState.correct_answer) === oIdx}
                        onChange={() => setFormState({ ...formState, correct_answer: oIdx })}
                        className="accent-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <input
                        type="text"
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}...`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...formState.options];
                          updated[oIdx] = e.target.value;
                          setFormState({ ...formState, options: updated });
                        }}
                        className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-[#FF9900]"
                        required={oIdx < 2}
                      />
                    </div>
                  ))}
                </div>
              )}

              {formState.question_type === 'multi_select' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#dbc2ad] uppercase tracking-wider font-bold">
                      Options &amp; Correct Answers (Check all that apply)
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormState({ ...formState, options: [...formState.options, ''] })}
                      className="text-[#a8e063] hover:underline font-bold text-[11px] cursor-pointer"
                    >
                      + Add Option
                    </button>
                  </div>
                  {formState.options.map((opt, oIdx) => {
                    const isSelected = Array.isArray(formState.correct_answer) && formState.correct_answer.includes(opt);
                    return (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected && Boolean(opt)}
                          onChange={(e) => {
                            if (!opt) return;
                            const current = Array.isArray(formState.correct_answer) ? [...formState.correct_answer] : [];
                            if (e.target.checked) {
                              if (!current.includes(opt)) current.push(opt);
                            } else {
                              const idx = current.indexOf(opt);
                              if (idx !== -1) current.splice(idx, 1);
                            }
                            setFormState({ ...formState, correct_answer: current });
                          }}
                          className="accent-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <input
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)}...`}
                          value={opt}
                          onChange={(e) => {
                            const updated = [...formState.options];
                            const oldVal = updated[oIdx];
                            updated[oIdx] = e.target.value;
                            let current = Array.isArray(formState.correct_answer) ? [...formState.correct_answer] : [];
                            if (current.includes(oldVal)) {
                              current = current.map((item) => (item === oldVal ? e.target.value : item));
                            }
                            setFormState({ ...formState, options: updated, correct_answer: current });
                          }}
                          className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-[#FF9900]"
                          required={oIdx < 2}
                        />
                        {formState.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formState.options.filter((_, idx) => idx !== oIdx);
                              setFormState({ ...formState, options: updated });
                            }}
                            className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {formState.question_type === 'objective' && (
                <div>
                  <label className="text-[#dbc2ad] uppercase tracking-wider block mb-1 font-bold">
                    Correct Answer / Expected Value *
                  </label>
                  <input
                    type="text"
                    value={typeof formState.correct_answer === 'string' ? formState.correct_answer : ''}
                    onChange={(e) => setFormState({ ...formState, correct_answer: e.target.value })}
                    placeholder="e.g. Amazon Aurora"
                    className="w-full bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-[#FF9900]"
                    required
                  />
                </div>
              )}

              {/* Footer */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-white/20 text-[#dbc2ad] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#ffb86f] text-black font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-[#FF9900]/20 disabled:opacity-50"
                >
                  {savingQuestion ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question (1 Mark)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: DELETE CONFIRMATION
         ═══════════════════════════════════════════════════════════ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-red-500/40 p-6 max-w-md w-full font-mono text-xs shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <span className="material-symbols-outlined">warning</span>
              Confirm Question Deletion
            </div>
            <p className="text-[#dbc2ad]">
              Are you sure you want to delete question #{deleteConfirmId}?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-white/20 text-[#dbc2ad] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteQuestion(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: DELETE SUBMISSION CONFIRMATION (NO BROWSER POPUP)
         ═══════════════════════════════════════════════════════════ */}
      {deleteSubmissionConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-red-500/50 p-6 max-w-md w-full font-mono text-xs shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <span className="material-symbols-outlined">warning</span>
              Confirm Submission Deletion
            </div>
            <p className="text-[#dbc2ad] leading-relaxed">
              Are you sure you want to permanently delete the submission for{' '}
              <strong className="text-white">{deleteSubmissionConfirm.participant_name}</strong>?
            </p>
            <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 space-y-1">
              <div>Email: <span className="text-[#FF9900]">{deleteSubmissionConfirm.participant_email}</span></div>
              <div>Registration No: <span className="text-white">{deleteSubmissionConfirm.participant_reg_no || 'N/A'}</span></div>
              <div>Score: <span className="text-emerald-400 font-bold">{deleteSubmissionConfirm.score} / {deleteSubmissionConfirm.total_marks}</span></div>
            </div>
            <p className="text-[11px] text-white/40">
              ⚠️ Deleting this submission will allow this student to re-take the assessment.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteSubmissionConfirm(null)}
                className="px-4 py-2 border border-white/20 text-[#dbc2ad] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteResult(deleteSubmissionConfirm.id);
                  setDeleteSubmissionConfirm(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase cursor-pointer"
              >
                Delete Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: RESET ALL RESULTS CONFIRMATION
         ═══════════════════════════════════════════════════════════ */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-red-500/50 p-6 max-w-md w-full font-mono text-xs shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <span className="material-symbols-outlined">dangerous</span>
              Clear All Leaderboard Results?
            </div>
            <p className="text-[#dbc2ad]">
              This will permanently remove all student submissions and clear the winner standings.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 border border-white/20 text-[#dbc2ad] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAllResults}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: INSPECT & EDIT SUBMISSION BREAKDOWN & ANSWERS
         ═══════════════════════════════════════════════════════════ */}
      {viewSubmissionModal && (() => {
        const previewCorrectCount = reviewItems.filter(it => it.isCorrect).length;
        const previewTotal = Math.max(1, reviewItems.length);
        const previewTotalMarks = previewTotal * 1.0;
        const previewAccuracyScore = parseFloat((previewCorrectCount * 0.6).toFixed(2));
        const previewSpeedScore = parseFloat(Number(viewSubmissionModal.speed_score || 0).toFixed(2));
        const previewFinalScore = parseFloat((previewAccuracyScore + previewSpeedScore).toFixed(2));
        const previewPercentage = parseFloat(((previewFinalScore / previewTotalMarks) * 100).toFixed(2));
        const previewTimeTaken = viewSubmissionModal.time_taken_seconds || 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
            <div className="bg-[#12161f] border border-white/20 max-w-4xl w-full p-5 sm:p-6 font-mono text-xs shadow-2xl flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Review &amp; Edit Submission: <span className="text-[#FF9900]">{viewSubmissionModal.participant_name}</span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-[#dbc2ad] mt-0.5">
                    {viewSubmissionModal.participant_email} {viewSubmissionModal.participant_reg_no ? `| Reg: ${viewSubmissionModal.participant_reg_no}` : ''} | Submitted: {new Date(viewSubmissionModal.submitted_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setViewSubmissionModal(null)}
                  className="text-white/40 hover:text-white p-1 transition-colors cursor-pointer bg-transparent border-none"
                  title="Close"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Dynamic Score Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 shrink-0">
                <div className="bg-white/3 p-3 border border-white/10 text-center">
                  <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block font-bold">Final Score</span>
                  <span className="text-xl font-bold text-[#a8e063] block mt-0.5">
                    {previewFinalScore.toFixed(2)} <span className="text-xs text-white/50">/ {previewTotalMarks.toFixed(2)}</span>
                  </span>
                  <span className="text-[9px] text-[#dbc2ad]">({previewPercentage}%)</span>
                </div>

                <div className="bg-white/3 p-3 border border-amber-500/30 text-center bg-amber-500/5">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[10px] text-[#FF9900] uppercase tracking-wider font-bold">Correctness (60%)</span>
                  </div>
                  <span className="text-xl font-bold text-[#FF9900] block mt-0.5">
                    +{previewAccuracyScore.toFixed(2)} <span className="text-xs text-white/50">pts</span>
                  </span>
                  <span className="text-[9px] text-[#dbc2ad]">
                    {previewCorrectCount} of {previewTotal} correct (×0.6)
                  </span>
                </div>

                <div className="bg-white/3 p-3 border border-sky-500/20 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[10px] text-[#00a8e0] uppercase tracking-wider font-bold">Speed Bonus (40%)</span>
                  </div>
                  <span className="text-xl font-bold text-[#00a8e0] block mt-0.5">
                    +{previewSpeedScore.toFixed(2)} <span className="text-xs text-white/50">pts</span>
                  </span>
                  <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Unchanged</span>
                </div>

                <div className="bg-white/3 p-3 border border-white/10 text-center">
                  <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block font-bold">Time Taken</span>
                  <span className="text-xl font-bold text-white block mt-0.5">
                    {Math.floor(previewTimeTaken / 60)}m {previewTimeTaken % 60}s
                  </span>
                  <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Unchanged</span>
                </div>
              </div>

              {/* Add Question to Submission Bar */}
              <div className="p-3 bg-white/4 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 mb-3">
                <span className="text-[11px] text-[#dbc2ad] font-bold whitespace-nowrap flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-[#FF9900]">add_circle</span>
                  Add Question to Attempt:
                </span>
                <select
                  value={selectedAddQuestionId}
                  onChange={(e) => setSelectedAddQuestionId(e.target.value)}
                  className="flex-1 bg-black/50 border border-white/15 px-3 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-[#FF9900]"
                >
                  <option value="">-- Choose question from Question Bank to include --</option>
                  {questions
                    .filter((q) => !reviewItems.some((it) => String(it.questionId) === String(q.id)))
                    .map((q) => (
                      <option key={q.id} value={q.id}>
                        #{q.id} [{q.question_type?.toUpperCase()}] - {String(q.question_text || q.assertion || '').slice(0, 80)}...
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddQuestionToSubmission}
                  disabled={!selectedAddQuestionId}
                  className="px-4 py-1.5 bg-[#FF9900] text-black font-bold uppercase tracking-wider text-[10px] hover:bg-[#ffaa22] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none whitespace-nowrap transition-all"
                >
                  + Add Question
                </button>
              </div>

              {/* Scrollable Questions & Answers List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {reviewItems.length === 0 ? (
                  <div className="text-center py-12 text-white/40">No questions found in this submission.</div>
                ) : (
                  reviewItems.map((item, idx) => {
                    const qType = item.questionType;
                    const diffBadge = DIFFICULTY_LEVELS.find((d) => d.id === item.difficulty) || DIFFICULTY_LEVELS[1];
                    const typeBadge = QUESTION_TYPES.find((t) => t.id === qType) || QUESTION_TYPES[0];

                    return (
                      <div
                        key={item.questionId || idx}
                        className={`border p-4 transition-colors ${
                          item.isCorrect
                            ? 'bg-emerald-950/15 border-emerald-500/40'
                            : item.isAnswered
                            ? 'bg-red-950/15 border-red-500/40'
                            : 'bg-white/2 border-white/10'
                        }`}
                      >
                        {/* Question Top Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/8 mb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-white text-xs">Question #{idx + 1}</span>
                            <span
                              className="text-[9px] px-1.5 py-0.5 uppercase tracking-wider font-bold"
                              style={{ background: typeBadge.bg, color: typeBadge.color, border: `1px solid ${typeBadge.border}` }}
                            >
                              {typeBadge.label}
                            </span>
                            <span
                              className="text-[9px] px-1.5 py-0.5 uppercase tracking-wider font-bold"
                              style={{ background: diffBadge.bg, color: diffBadge.color, border: `1px solid ${diffBadge.border}` }}
                            >
                              {diffBadge.label}
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider rounded-sm ${
                                item.isCorrect
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : item.isAnswered
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : 'bg-white/10 text-white/50 border border-white/15'
                              }`}
                            >
                              {item.isCorrect ? '✓ Correct (+0.6 pts)' : item.isAnswered ? '✕ Incorrect (0 pts)' : '○ Unanswered (0 pts)'}
                            </span>
                          </div>

                          {/* Quick Marking Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleMarkCorrect(idx)}
                              className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                              title="Mark as correct (sets answer to correct key)"
                            >
                              ✓ Correct
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkIncorrect(idx)}
                              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                              title="Mark as incorrect"
                            >
                              ✕ Wrong
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClearAnswer(idx)}
                              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/60 border border-white/15 text-[9px] uppercase tracking-wider cursor-pointer"
                              title="Clear answer (mark unanswered)"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionFromSubmission(idx)}
                              className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-[9px] cursor-pointer"
                              title="Remove question from this submission"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Question Statement */}
                        {item.assertion ? (
                          <div className="space-y-1.5 mb-3 text-[11px] leading-relaxed">
                            <p className="text-white/90">
                              <strong className="text-[#FF9900]">Assertion (A):</strong> {item.assertion}
                            </p>
                            <p className="text-white/90">
                              <strong className="text-[#00a8e0]">Reason (R):</strong> {item.reason}
                            </p>
                          </div>
                        ) : (
                          <p className="text-white/95 text-[11px] leading-relaxed mb-3 font-medium whitespace-pre-wrap">
                            {item.questionText}
                          </p>
                        )}

                        {/* Interactive Option Selection / Answer Inputs */}
                        <div className="mt-2 space-y-1.5">
                          <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider font-bold block mb-1">
                            Participant Response (Click to change ticked answer):
                          </span>

                          {/* MCQ or Assertion Reason options */}
                          {(qType === 'mcq' || qType === 'assertion_reason') && (
                            <div className="space-y-1.5">
                              {(item.options || []).map((opt, optIdx) => {
                                const isUserPicked =
                                  String(item.userAnswer ?? '').trim().toLowerCase() === String(opt).trim().toLowerCase();
                                const isRightAnswer =
                                  String(item.correctAnswer ?? '').trim().toLowerCase() === String(opt).trim().toLowerCase();

                                return (
                                  <label
                                    key={optIdx}
                                    onClick={() => handleUpdateItemAnswer(idx, opt)}
                                    className={`flex items-start gap-2.5 p-2.5 border text-[11px] cursor-pointer transition-colors ${
                                      isUserPicked && isRightAnswer
                                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 font-medium'
                                        : isUserPicked
                                        ? 'bg-red-500/20 border-red-400 text-red-100 font-medium'
                                        : isRightAnswer
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                        : 'bg-black/30 border-white/10 text-white/70 hover:bg-white/5'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`question_${item.questionId || idx}`}
                                      checked={isUserPicked}
                                      onChange={() => handleUpdateItemAnswer(idx, opt)}
                                      className="mt-0.5 accent-[#FF9900]"
                                    />
                                    <span className="font-bold text-xs">{String.fromCharCode(65 + optIdx)}.</span>
                                    <span className="flex-1 leading-snug">{opt}</span>
                                    {isUserPicked && (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-white/15 text-white font-bold uppercase rounded-xs">
                                        Ticked
                                      </span>
                                    )}
                                    {isRightAnswer && (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/30 text-emerald-300 font-bold uppercase rounded-xs">
                                        Correct Key
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Multi Select checkboxes */}
                          {qType === 'multi_select' && (
                            <div className="space-y-1.5">
                              {(item.options || []).map((opt, optIdx) => {
                                const userList = Array.isArray(item.userAnswer) ? item.userAnswer : [];
                                const isUserPicked = userList.some(
                                  (v) => String(v).trim().toLowerCase() === String(opt).trim().toLowerCase()
                                );
                                const isRightAnswer =
                                  Array.isArray(item.correctAnswer) &&
                                  item.correctAnswer.some(
                                    (v) => String(v).trim().toLowerCase() === String(opt).trim().toLowerCase()
                                  );

                                return (
                                  <label
                                    key={optIdx}
                                    onClick={() => handleToggleMultiSelectOption(idx, opt)}
                                    className={`flex items-start gap-2.5 p-2.5 border text-[11px] cursor-pointer transition-colors ${
                                      isUserPicked && isRightAnswer
                                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 font-medium'
                                        : isUserPicked
                                        ? 'bg-red-500/20 border-red-400 text-red-100 font-medium'
                                        : isRightAnswer
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                        : 'bg-black/30 border-white/10 text-white/70 hover:bg-white/5'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isUserPicked}
                                      onChange={() => handleToggleMultiSelectOption(idx, opt)}
                                      className="mt-0.5 accent-[#FF9900]"
                                    />
                                    <span className="font-bold text-xs">{String.fromCharCode(65 + optIdx)}.</span>
                                    <span className="flex-1 leading-snug">{opt}</span>
                                    {isUserPicked && (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-white/15 text-white font-bold uppercase rounded-xs">
                                        Ticked
                                      </span>
                                    )}
                                    {isRightAnswer && (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/30 text-emerald-300 font-bold uppercase rounded-xs">
                                        Correct Key
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Objective text input */}
                          {qType === 'objective' && (
                            <div className="space-y-2">
                              <div>
                                <label className="text-[10px] text-[#dbc2ad] block mb-1">User Typed Answer:</label>
                                <input
                                  type="text"
                                  value={item.userAnswer || ''}
                                  onChange={(e) => handleUpdateItemAnswer(idx, e.target.value)}
                                  placeholder="Type participant answer..."
                                  className="w-full bg-black/40 border border-white/20 p-2.5 font-mono text-xs text-white focus:outline-none focus:border-[#FF9900]"
                                />
                              </div>
                              <div className="text-[10px] text-emerald-300 bg-emerald-950/20 border border-emerald-500/20 p-2">
                                <span className="font-bold uppercase tracking-wider">Official Correct Key:</span>{' '}
                                {Array.isArray(item.correctAnswer)
                                  ? item.correctAnswer.join(' OR ')
                                  : String(item.correctAnswer || 'N/A')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Error Display */}
              {reviewModalError && (
                <div className="p-2.5 mt-3 bg-red-950/40 border border-red-500/40 text-red-300 text-xs shrink-0">
                  {reviewModalError}
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="border-t border-white/10 pt-4 mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <p className="text-[10px] text-[#dbc2ad]">
                  Changing answers will update the participant&apos;s score. Speed Bonus &amp; Time Taken remain intact.
                </p>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setViewSubmissionModal(null)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer transition-colors border-none uppercase tracking-wider text-[11px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSubmission}
                    disabled={savingSubmission}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-[#FF9900] hover:bg-[#ffaa22] text-black font-bold uppercase tracking-wider text-[11px] cursor-pointer transition-all border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#FF9900]/20"
                  >
                    {savingSubmission ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">save</span>
                        <span>Save Changes &amp; Recalculate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
