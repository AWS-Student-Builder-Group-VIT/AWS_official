import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
// Time allowed per question: 0.5 minutes. Keep in step with the server.
const SECONDS_PER_QUESTION = 30;
import {
  fetchPublicQuizInfo,
  fetchPublicQuizQuestions,
  fetchParticipantSubmission,
  submitPublicQuizAssessment,
} from '../../utils/auth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '225205318470-pn0cdqbs39jg8b60lem10e6fs9vh72q4.apps.googleusercontent.com';

const REGISTRATION_REGEX = /(\d{2}[A-Za-z]{2,4}\d{4,5})/i;

function extractVitIdentity(googleName, email = '') {
  const raw = String(googleName ?? '').trim();
  let match = raw.match(REGISTRATION_REGEX);
  let name = raw;
  let regNo = null;

  if (match) {
    regNo = match[1].toUpperCase();
    name = raw.replace(REGISTRATION_REGEX, ' ').replace(/\s+/g, ' ').trim();
  } else if (email) {
    const emailPrefix = String(email).split('@')[0];
    const emailMatch = emailPrefix.match(REGISTRATION_REGEX);
    if (emailMatch) {
      regNo = emailMatch[1].toUpperCase();
    }
  }

  return { name: name || raw, registrationNumber: regNo };
}

function decodeGoogleJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding Google JWT:', e);
    return null;
  }
}

export default function QuizParticipantPage() {
  const navigate = useNavigate();

  // Stages: 'auth' | 'dashboard' | 'assessment' | 'result'
  const [stage, setStage] = useState('auth');

  // Participant State (Decoupled Internal vs External)
  const [participantType, setParticipantType] = useState(() => {
    try {
      const saved = sessionStorage.getItem('quiz_participant');
      return saved ? (JSON.parse(saved).participantType || 'internal') : 'internal';
    } catch {
      return 'internal';
    }
  });

  const [internalData, setInternalData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('quiz_participant');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.participantType === 'internal') {
          return {
            name: parsed.name || '',
            email: parsed.email || '',
            regNo: parsed.regNo || '',
            regNoFromGoogle: Boolean(parsed.regNoFromGoogle),
            googleVerified: Boolean(parsed.googleVerified),
          };
        }
      }
    } catch {}
    return { name: '', email: '', regNo: '', regNoFromGoogle: false, googleVerified: false };
  });

  const [externalData, setExternalData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('quiz_participant');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.participantType === 'external') {
          return {
            name: parsed.name || '',
            email: parsed.email || '',
            regNo: parsed.regNo === 'EXTERNAL' ? '' : (parsed.regNo || ''),
            googleVerified: Boolean(parsed.googleVerified),
          };
        }
      }
    } catch {}
    return { name: '', email: '', regNo: '', googleVerified: false };
  });

  const [participant, setParticipant] = useState(() => {
    try {
      const saved = sessionStorage.getItem('quiz_participant');
      return saved ? JSON.parse(saved) : { name: '', email: '', regNo: '', participantType: 'internal', googleVerified: false };
    } catch {
      return { name: '', email: '', regNo: '', participantType: 'internal', googleVerified: false };
    }
  });

  // Quiz Meta
  const [quizInfo, setQuizInfo] = useState({
    title: 'Cloud Intelligence Assessment',
    durationMinutes: 4.5,
    allottedSeconds: 270,
    isFrozen: false,
    totalQuestions: 0,
  });
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Active Assessment State
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qId]: value }
  const [markedForReview, setMarkedForReview] = useState({}); // { [qId]: boolean }
  const [timeRemaining, setTimeRemaining] = useState(270); // Total Quiz Timer
  const [questionTimeMap, setQuestionTimeMap] = useState({}); // { [qId]: remaining seconds for that question }
  const [timeTaken, setTimeTaken] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

  // Proctoring & Security State
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [rightClickCount, setRightClickCount] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [warningModal, setWarningModal] = useState(null); // { type, title, message, count, max }
  const [warningToast, setWarningToast] = useState(null); // { message }
  const [proctoringViolationReason, setProctoringViolationReason] = useState('');

  // Submission Result & Attempt Tracking
  const [resultData, setResultData] = useState(null);
  // Full paper for the review screen; only sent once an admin releases results.
  const [review, setReview] = useState([]);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [checkingAttempt, setCheckingAttempt] = useState(false);
  const [authError, setAuthError] = useState('');

  // Refs for stable timer, proctoring counters, and submit listeners
  const fullscreenCountRef = useRef(0);
  const tabSwitchCountRef = useRef(0);
  const rightClickCountRef = useRef(0);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const questionTimeMapRef = useRef(questionTimeMap);
  questionTimeMapRef.current = questionTimeMap;
  const timeTakenRef = useRef(timeTaken);
  timeTakenRef.current = timeTaken;
  const participantRef = useRef(participant);
  participantRef.current = participant;
  const submittingRef = useRef(submitting);
  submittingRef.current = submitting;
  const timerRef = useRef(null);

  // ── Check Existing Single Attempt ─────────────────────────────
  const checkExistingAttempt = useCallback(async (email) => {
    if (!email) return false;
    setCheckingAttempt(true);
    try {
      const res = await fetchParticipantSubmission(email.trim().toLowerCase());
      if (res.ok && res.hasSubmitted && res.submission) {
        setExistingSubmission(res.submission);
        setResultData(res.submission);
        setReview(res.review ?? []);
        setStage('result');
        setCheckingAttempt(false);
        return true;
      }
    } catch (err) {
      console.error('Error checking existing attempt:', err);
    }
    setCheckingAttempt(false);
    return false;
  }, []);

  // Check saved session on mount
  useEffect(() => {
    if (participant?.email) {
      checkExistingAttempt(participant.email);
    }
  }, [participant?.email, checkExistingAttempt]);

  // Retry fetching result if landed on result stage without data
  useEffect(() => {
    if (stage === 'result' && !resultData && participant?.email) {
      checkExistingAttempt(participant.email);
    }
  }, [stage, resultData, participant?.email, checkExistingAttempt]);

  // ── Participant Logout / Switch Account ───────────────────────
  const handleLogoutParticipant = () => {
    sessionStorage.removeItem('quiz_participant');
    setParticipant({ name: '', email: '', regNo: '', participantType: 'internal', googleVerified: false });
    setInternalData({ name: '', email: '', regNo: '', regNoFromGoogle: false, googleVerified: false });
    setExternalData({ name: '', email: '', regNo: '', googleVerified: false });
    setExistingSubmission(null);
    setResultData(null);
    setReview([]);
    setAnswers({});
    setQuestions([]);
    setProctoringViolationReason('');
    fullscreenCountRef.current = 0;
    tabSwitchCountRef.current = 0;
    rightClickCountRef.current = 0;
    setStage('auth');
  };

  // ── 1. Fetch Quiz Info & Polling for Unfreeze ─────────────────
  const loadInfo = async () => {
    const res = await fetchPublicQuizInfo();
    if (res.ok) {
      const qCount = res.totalQuestions || 0;
      const calculatedDuration = Number(((qCount || 1) * (SECONDS_PER_QUESTION / 60)).toFixed(1));
      const calculatedAllotted = Math.max(SECONDS_PER_QUESTION, qCount * SECONDS_PER_QUESTION);

      setQuizInfo({
        title: res.title || 'Cloud Intelligence Assessment',
        durationMinutes: res.durationMinutes || calculatedDuration,
        allottedSeconds: res.allottedSeconds || calculatedAllotted,
        isFrozen: res.isFrozen,
        totalQuestions: qCount,
      });

      // ONLY set initial time if NOT currently in the assessment stage
      if (stageRef.current !== 'assessment') {
        setTimeRemaining(res.allottedSeconds || calculatedAllotted);
      }
    }
    setLoadingInfo(false);
  };

  useEffect(() => {
    loadInfo();
    const interval = setInterval(loadInfo, 4000);
    return () => clearInterval(interval);
  }, []);

  // ── 6. Submit Assessment ─────────────────────────────────────
  const handleFinalSubmit = useCallback(async (auto = false, violationReason = '') => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    if (violationReason) {
      setProctoringViolationReason(violationReason);
    }

    const savedProfile = (() => {
      try {
        return JSON.parse(sessionStorage.getItem('quiz_participant') || '{}');
      } catch {
        return {};
      }
    })();

    const cleanEmail = (participantRef.current.email || participant.email || savedProfile.email || '').trim().toLowerCase();
    const cleanName = (participantRef.current.name || participant.name || savedProfile.name || 'Candidate').trim();
    const cleanRegNo = (participantRef.current.regNo || participant.regNo || savedProfile.regNo || '').trim().toUpperCase();

    const payload = {
      participantName: cleanName,
      participantEmail: cleanEmail,
      participantRegNo: cleanRegNo,
      answers: answersRef.current || {},
      timeTakenSeconds: timeTakenRef.current || 0,
    };

    try {
      const res = await submitPublicQuizAssessment(payload);
      setSubmitting(false);
      submittingRef.current = false;
      setSubmitConfirmOpen(false);

      if (res.submission) {
        setExistingSubmission(res.submission);
        setResultData(res.submission);
        setReview(res.review ?? []);
        setStage('result');
      } else {
        const check = await fetchParticipantSubmission(cleanEmail);
        if (check.ok && check.submission) {
          setExistingSubmission(check.submission);
          setResultData(check.submission);
        }
        setStage('result');
      }
    } catch (err) {
      console.error('Final submit error:', err);
      setSubmitting(false);
      submittingRef.current = false;
      setStage('result');
    }
  }, [participant.email, participant.name, participant.regNo]);

  // ── 2. Handle Google OAuth & Candidate Identification ───────
  const handleGoogleSuccess = async (credentialResponse) => {
    setAuthError('');
    if (!credentialResponse?.credential) {
      setAuthError('Google sign in failed. Please try again.');
      return;
    }

    const payload = decodeGoogleJwt(credentialResponse.credential);
    if (!payload || !payload.email) {
      setAuthError('Could not read Google profile. Please try again.');
      return;
    }

    const email = (payload.email || '').trim().toLowerCase();
    const isVitEmail = email.endsWith('@vitstudent.ac.in') || email.endsWith('@vit.ac.in');

    if (participantType === 'internal' && !isVitEmail) {
      setAuthError(`Only official VIT student accounts (@vitstudent.ac.in / @vit.ac.in) are allowed for Internal participants. If you are an external participant, select "External Participant" above. (Detected: ${email})`);
      return;
    }

    // Check if already attempted
    const hasAlreadySubmitted = await checkExistingAttempt(email);
    if (hasAlreadySubmitted) return;

    if (participantType === 'internal') {
      const identity = extractVitIdentity(payload.name || payload.given_name || '', email);
      setInternalData({
        email,
        name: identity.name || payload.name || payload.given_name || '',
        regNo: identity.registrationNumber || '',
        regNoFromGoogle: Boolean(identity.registrationNumber),
        googleVerified: true,
      });
    } else {
      setExternalData((prev) => ({
        ...prev,
        email,
        name: payload.name || payload.given_name || prev.name || '',
        googleVerified: true,
      }));
    }
  };

  const handleGoogleError = () => {
    setAuthError('Google sign in popup was closed or encountered an error.');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (participantType === 'internal') {
      const cleanEmail = internalData.email.trim().toLowerCase();
      const cleanName = internalData.name.trim();
      const cleanRegNo = internalData.regNo.trim().toUpperCase();

      if (!cleanName || !cleanEmail) {
        setAuthError('Please fill in your name and email address.');
        return;
      }

      if (!cleanRegNo) {
        setAuthError('Please enter your official VIT registration number.');
        return;
      }

      const isVitEmail = cleanEmail.endsWith('@vitstudent.ac.in') || cleanEmail.endsWith('@vit.ac.in');
      if (!isVitEmail) {
        setAuthError('Please use a valid VIT student email address (@vitstudent.ac.in or @vit.ac.in) for internal participation.');
        return;
      }

      const hasAlreadySubmitted = await checkExistingAttempt(cleanEmail);
      if (hasAlreadySubmitted) return;

      const profile = {
        name: cleanName,
        email: cleanEmail,
        regNo: cleanRegNo,
        regNoFromGoogle: internalData.regNoFromGoogle,
        participantType: 'internal',
        googleVerified: internalData.googleVerified,
      };
      sessionStorage.setItem('quiz_participant', JSON.stringify(profile));
      setParticipant(profile);
      participantRef.current = profile;
      setStage('dashboard');
    } else {
      const cleanEmail = externalData.email.trim().toLowerCase();
      const cleanName = externalData.name.trim();
      const cleanRegNo = (externalData.regNo || '').trim().toUpperCase() || 'EXTERNAL';

      if (!cleanName || !cleanEmail) {
        setAuthError('Please fill in your name and email address.');
        return;
      }

      const hasAlreadySubmitted = await checkExistingAttempt(cleanEmail);
      if (hasAlreadySubmitted) return;

      const profile = {
        name: cleanName,
        email: cleanEmail,
        regNo: cleanRegNo,
        regNoFromGoogle: false,
        participantType: 'external',
        googleVerified: externalData.googleVerified,
      };
      sessionStorage.setItem('quiz_participant', JSON.stringify(profile));
      setParticipant(profile);
      participantRef.current = profile;
      setStage('dashboard');
    }
  };

  // ── 3. Start Assessment & Enter Fullscreen ───────────────────
  const requestFullScreenMode = () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  const handleStartQuiz = async () => {
    if (quizInfo.isFrozen) return;

    // Check existing attempt before launching
    if (participant.email) {
      const hasAlreadySubmitted = await checkExistingAttempt(participant.email);
      if (hasAlreadySubmitted) return;
    }

    setLoadingInfo(true);
    const res = await fetchPublicQuizQuestions(participant.email?.trim().toLowerCase());
    setLoadingInfo(false);

    if (res.ok && res.questions?.length > 0) {
      const qCount = res.questions.length;
      const perQuestionLimit = Number(res.secondsPerQuestion) || SECONDS_PER_QUESTION;
      const dynamicAllottedSeconds = qCount * perQuestionLimit; // 30s per question (0.5 * n minutes)

      // Initialize the persistent per-question timer
      const initialMap = {};
      res.questions.forEach((q) => {
        initialMap[q.id] = perQuestionLimit;
      });

      setQuestions(res.questions);
      setCurrentIndex(0);
      setAnswers({});
      setMarkedForReview({});
      setQuestionTimeMap(initialMap);
      questionTimeMapRef.current = initialMap;
      setTimeRemaining(dynamicAllottedSeconds);
      setTimeTaken(0);

      // Reset Proctoring Counters
      fullscreenCountRef.current = 0;
      tabSwitchCountRef.current = 0;
      rightClickCountRef.current = 0;
      setFullscreenExitCount(0);
      setRightClickCount(0);
      setTabSwitchCount(0);
      setWarningModal(null);
      setWarningToast(null);
      setProctoringViolationReason('');

      // Enter Fullscreen
      requestFullScreenMode();
      setStage('assessment');
    } else {
      setAuthError(res.error || 'No questions available in the question bank. Please contact the administrator.');
    }
  };

  // ── 4. Assessment Timer (Single Continuous Interval) ─────────
  useEffect(() => {
    if (stage !== 'assessment') return;

    timerRef.current = setInterval(() => {
      // 1. Decrement Total assessment remaining time
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinalSubmit(true, 'Assessment auto-submitted: Total allotted time expired.');
          return 0;
        }
        return prev - 1;
      });

      // 2. Decrement only active question's persistent remaining time & auto-advance if expired
      setQuestionTimeMap((prev) => {
        const curQ = questionsRef.current[currentIndexRef.current];
        if (!curQ) return prev;
        const curTime = prev[curQ.id] !== undefined ? prev[curQ.id] : SECONDS_PER_QUESTION;
        const newTime = Math.max(0, curTime - 1);
        const updated = {
          ...prev,
          [curQ.id]: newTime,
        };
        questionTimeMapRef.current = updated;

        // If the current question just expired (reached 0s), auto-advance to next available question
        if (newTime === 0 && curTime > 0) {
          const allQuestions = questionsRef.current || [];
          let nextAvailableIndex = -1;

          // Look forwards first (from currentIndex + 1 onwards)
          for (let i = currentIndexRef.current + 1; i < allQuestions.length; i++) {
            const q = allQuestions[i];
            const remaining = updated[q.id] !== undefined ? updated[q.id] : SECONDS_PER_QUESTION;
            if (remaining > 0) {
              nextAvailableIndex = i;
              break;
            }
          }

          // If no remaining question ahead, look from start
          if (nextAvailableIndex === -1) {
            for (let i = 0; i < currentIndexRef.current; i++) {
              const q = allQuestions[i];
              const remaining = updated[q.id] !== undefined ? updated[q.id] : SECONDS_PER_QUESTION;
              if (remaining > 0) {
                nextAvailableIndex = i;
                break;
              }
            }
          }

          if (nextAvailableIndex !== -1) {
            setCurrentIndex(nextAvailableIndex);
          } else {
            // All questions have expired
            clearInterval(timerRef.current);
            handleFinalSubmit(true, 'Assessment auto-submitted: 30-second time expired for all questions.');
          }
        }

        return updated;
      });

      setTimeTaken((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage, handleFinalSubmit]);

  // ── 5. Proctoring Listeners: Fullscreen, Right Click & Tab Switch ──
  useEffect(() => {
    if (stage !== 'assessment') return;

    // 1. Fullscreen Exit Listener (Max 5 warnings)
    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (!isFull) {
        fullscreenCountRef.current += 1;
        const count = fullscreenCountRef.current;
        setFullscreenExitCount(count);

        if (count >= 5) {
          handleFinalSubmit(true, 'Assessment auto-submitted: Exceeded maximum (5) Full-Screen exit violations.');
        } else {
          setWarningModal({
            type: 'fullscreen',
            title: 'FULL-SCREEN VIOLATION DETECTED',
            message: `You have exited full-screen mode (${count}/5 warnings). Assessment must remain in full-screen mode at all times.`,
            count,
            max: 5,
          });
        }
      }
    };

    // 2. Right-Click Prevention Listener (Max 5 warnings)
    const handleContextMenu = (e) => {
      e.preventDefault();
      rightClickCountRef.current += 1;
      const count = rightClickCountRef.current;
      setRightClickCount(count);

      if (count >= 5) {
        handleFinalSubmit(true, 'Assessment auto-submitted: Exceeded maximum (5) Right-Click violation warnings.');
      } else {
        setWarningToast({
          message: `⚠️ Right-click is prohibited (${count}/5 warnings)!`,
        });
        setTimeout(() => setWarningToast(null), 3000);
      }
      return false;
    };

    // 3. Tab Switch / Window Blur Listener (Max 3 warnings)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCountRef.current += 1;
        const count = tabSwitchCountRef.current;
        setTabSwitchCount(count);

        if (count >= 3) {
          handleFinalSubmit(true, 'Assessment auto-submitted: Exceeded maximum (3) Tab switch / focus loss violations.');
        } else {
          setWarningModal({
            type: 'tab_switch',
            title: 'TAB SWITCH DETECTED',
            message: `You switched tabs or minimized the assessment window (${count}/3 warnings). Navigating away is strictly prohibited.`,
            count,
            max: 3,
          });
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stage, handleFinalSubmit]);

  // ── Question Answer Helpers ──────────────────────────────────
  const currentQuestion = questions[currentIndex] || null;
  const isCurrentQuestionExpired = currentQuestion
    ? (questionTimeMap[currentQuestion.id] !== undefined ? questionTimeMap[currentQuestion.id] : (quizInfo.secondsPerQuestion || SECONDS_PER_QUESTION)) <= 0
    : false;

  const getPrevUnexpiredIndex = useCallback(() => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const q = questions[i];
      const remaining = questionTimeMap[q.id] !== undefined ? questionTimeMap[q.id] : (quizInfo.secondsPerQuestion || SECONDS_PER_QUESTION);
      if (remaining > 0) return i;
    }
    return -1;
  }, [currentIndex, questions, questionTimeMap, quizInfo.secondsPerQuestion]);

  const getNextUnexpiredIndex = useCallback(() => {
    for (let i = currentIndex + 1; i < questions.length; i++) {
      const q = questions[i];
      const remaining = questionTimeMap[q.id] !== undefined ? questionTimeMap[q.id] : (quizInfo.secondsPerQuestion || SECONDS_PER_QUESTION);
      if (remaining > 0) return i;
    }
    return -1;
  }, [currentIndex, questions, questionTimeMap, quizInfo.secondsPerQuestion]);

  const handleSelectMCQ = (optionText) => {
    if (!currentQuestion || isCurrentQuestionExpired) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionText }));
  };

  const handleToggleMultiSelect = (optionText) => {
    if (!currentQuestion || isCurrentQuestionExpired) return;
    const current = Array.isArray(answers[currentQuestion.id]) ? [...answers[currentQuestion.id]] : [];
    if (current.includes(optionText)) {
      const idx = current.indexOf(optionText);
      current.splice(idx, 1);
    } else {
      current.push(optionText);
    }
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: current }));
  };

  const handleObjectiveChange = (text) => {
    if (!currentQuestion || isCurrentQuestionExpired) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: text }));
  };

  const toggleMarkForReview = () => {
    if (!currentQuestion || isCurrentQuestionExpired) return;
    setMarkedForReview((prev) => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }));
  };

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((a) => {
      if (Array.isArray(a)) return a.length > 0;
      return a !== undefined && a !== null && a !== '';
    }).length;
  }, [answers]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="font-product min-h-screen bg-[#080b11] text-white selection:bg-[#FF9900] selection:text-black">
        {/* ═══════════════════════════════════════════════════════════
            STAGE 1: STUDENT IDENTIFICATION & GOOGLE OAUTH LOGIN
           ═══════════════════════════════════════════════════════════ */}
        {stage === 'auth' && (
          <div className="min-h-screen flex items-center justify-center p-4 relative">
            <div className="w-full max-w-lg bg-[#12161f] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl relative">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 text-[11px] text-[#FF9900] font-medium uppercase tracking-[0.2em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
                  AWS Student Builder Group
                </div>
                <h1 className="mt-5 text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                  Cloud <span className="text-[#FF9900]">Intelligence</span>
                </h1>
                <p className="mt-3 text-sm text-[#dbc2ad]">Event assessment portal</p>
                <p className="mt-1 text-xs text-white/40">Build · Learn · Deploy</p>
                <div className="mt-6 h-px bg-white/10" />
              </div>

              {checkingAttempt && (
                <div className="mb-4 p-3 bg-white/5 border border-white/10 text-[#dbc2ad] text-xs flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                  <span>Verifying candidate submission status...</span>
                </div>
              )}

              {/* Already Attempted Banner */}
              {existingSubmission ? (
                <div className="space-y-5 text-xs text-center">
                  <div className="p-4 bg-amber-950/40 border border-amber-500/50 text-amber-200 space-y-2">
                    <div className="flex items-center justify-center gap-2 font-bold text-sm text-amber-300">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      <span>ASSESSMENT ALREADY COMPLETED</span>
                    </div>
                    <p className="text-white/80 text-[11px] leading-relaxed">
                      Account <strong className="text-[#FF9900]">{existingSubmission.participant_email}</strong> has already completed the assessment. Only 1 attempt is allowed.
                    </p>
                    <div className="p-2.5 bg-black/40 border border-white/10 text-left text-[11px] space-y-1">
                      <div>Candidate: <strong className="text-white">{existingSubmission.participant_name}</strong></div>
                      <div>Registration: <span className="text-white">{existingSubmission.participant_reg_no || 'N/A'}</span></div>
                      <div>Score: <span className="text-emerald-400 font-bold">{existingSubmission.score} / {existingSubmission.total_marks} marks</span></div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setResultData(existingSubmission);
                        setStage('result');
                      }}
                      className="w-full py-3.5 bg-[#FF9900] hover:bg-[#ffb86f] text-black font-bold uppercase tracking-wider text-xs cursor-pointer shadow-lg shadow-[#FF9900]/20 transition-all"
                    >
                      View My Submission Review
                    </button>
                    <button
                      type="button"
                      onClick={handleLogoutParticipant}
                      className="w-full py-2.5 border border-white/20 hover:bg-white/5 text-white/70 hover:text-white text-xs cursor-pointer transition-colors"
                    >
                      Sign In With Another Account
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {authError && (
                    <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">error</span>
                      <span>{authError}</span>
                    </div>
                  )}

                  {/* Participant Category Selector */}
                  <div className="mb-6">
                    <label className="text-[11px] font-bold text-[#dbc2ad] uppercase tracking-wider block mb-2">
                      Participant Category:
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setParticipantType('internal');
                          setAuthError('');
                        }}
                        className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          participantType === 'internal'
                            ? 'bg-[#FF9900] text-black shadow-md'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">school</span>
                        <span>Internal (VIT)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setParticipantType('external');
                          setAuthError('');
                        }}
                        className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          participantType === 'external'
                            ? 'bg-[#FF9900] text-black shadow-md'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">public</span>
                        <span>External</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-white/50 mt-1.5 text-center font-mono">
                      {participantType === 'internal'
                        ? '🔒 Only official VIT email accounts (@vitstudent.ac.in / @vit.ac.in) are authorized.'
                        : '🌐 Open to everyone (any valid Google account is accepted).'}
                    </p>
                  </div>

                  {/* ─────────────────────────────────────────────────────────
                      INTERNAL (VIT) FLOW
                     ───────────────────────────────────────────────────────── */}
                  {participantType === 'internal' && (
                    <>
                      {!internalData.googleVerified ? (
                        <div className="py-4 space-y-4 text-center">
                          <p className="text-xs text-[#dbc2ad]">
                            Please authenticate with your official VIT student Google account to proceed.
                          </p>
                          <div className="flex justify-center pt-1">
                            <GoogleLogin
                              onSuccess={handleGoogleSuccess}
                              onError={handleGoogleError}
                              theme="filled_black"
                              shape="rectangular"
                              text="continue_with"
                              size="large"
                            />
                          </div>
                          <span className="text-[10px] text-white/40 block">
                            Only @vitstudent.ac.in or @vit.ac.in accounts are permitted.
                          </span>
                        </div>
                      ) : (
                        <form onSubmit={handleAuthSubmit} className="space-y-5 text-xs">
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">verified</span>
                              <span className="text-xs">Account: <strong>{internalData.email}</strong> (Internal VIT)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setInternalData({ name: '', email: '', regNo: '', regNoFromGoogle: false, googleVerified: false });
                              }}
                              className="text-[10px] text-white/50 hover:text-white underline cursor-pointer"
                            >
                              Change
                            </button>
                          </div>

                          <div>
                            <label className="text-[#dbc2ad] uppercase tracking-wider block mb-1.5 font-bold">Candidate Full Name *</label>
                            <input
                              type="text"
                              placeholder="e.g. Alex Johnson"
                              value={internalData.name}
                              onChange={(e) => setInternalData((prev) => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white rounded-lg focus:outline-none focus:border-[#FF9900] transition-colors"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[#dbc2ad] uppercase tracking-wider block mb-1.5 font-bold">
                              Registration Number *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 22BCE1045"
                              value={internalData.regNo}
                              onChange={(e) => setInternalData((prev) => ({ ...prev, regNo: e.target.value }))}
                              readOnly={internalData.regNoFromGoogle}
                              className={`w-full bg-white/5 border border-white/10 px-4 py-3 text-white uppercase rounded-lg focus:outline-none focus:border-[#FF9900] transition-colors ${internalData.regNoFromGoogle ? 'opacity-70 cursor-not-allowed' : ''}`}
                              required
                            />
                            <span className="text-[10px] text-white/40 mt-1 block">
                              {internalData.regNoFromGoogle
                                ? 'Auto-fetched from your VIT Google account.'
                                : 'Enter your official VIT student registration number.'}
                            </span>
                          </div>

                          <button
                            type="submit"
                            className="w-full mt-3 py-3.5 bg-[#FF9900] hover:bg-[#ffb86f] text-black font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-[#FF9900]/20 transition-all text-xs"
                          >
                            Enter Assessment Lobby
                          </button>
                        </form>
                      )}
                    </>
                  )}

                  {/* ─────────────────────────────────────────────────────────
                      EXTERNAL FLOW
                     ───────────────────────────────────────────────────────── */}
                  {participantType === 'external' && (
                    <>
                      {!externalData.googleVerified ? (
                        <div className="py-4 space-y-4 text-center">
                          <p className="text-xs text-[#dbc2ad]">
                            Please authenticate with your Google account to proceed with the assessment.
                          </p>
                          <div className="flex justify-center pt-1">
                            <GoogleLogin
                              onSuccess={handleGoogleSuccess}
                              onError={handleGoogleError}
                              theme="filled_black"
                              shape="rectangular"
                              text="continue_with"
                              size="large"
                            />
                          </div>
                          <span className="text-[10px] text-white/40 block">
                            Any valid Google email account is accepted.
                          </span>
                        </div>
                      ) : (
                        <form onSubmit={handleAuthSubmit} className="space-y-5 text-xs">
                          <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">verified</span>
                              <span className="text-xs">Account: <strong>{externalData.email}</strong> (External)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setExternalData({ name: '', email: '', regNo: '', googleVerified: false });
                              }}
                              className="text-[10px] text-white/50 hover:text-white underline cursor-pointer"
                            >
                              Change
                            </button>
                          </div>

                          <div>
                            <label className="text-[#dbc2ad] uppercase tracking-wider block mb-1.5 font-bold">Candidate Full Name *</label>
                            <input
                              type="text"
                              placeholder="e.g. Alex Johnson"
                              value={externalData.name}
                              onChange={(e) => setExternalData((prev) => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white rounded-lg focus:outline-none focus:border-[#FF9900] transition-colors"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[#dbc2ad] uppercase tracking-wider block mb-1.5 font-bold">
                              Registration No. / College / Organization (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. MIT / Tech Club / Freelancer (Optional)"
                              value={externalData.regNo}
                              onChange={(e) => setExternalData((prev) => ({ ...prev, regNo: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white uppercase rounded-lg focus:outline-none focus:border-[#FF9900] transition-colors"
                            />
                            <span className="text-[10px] text-white/40 mt-1 block">
                              Optionally provide your institutional or organization identity.
                            </span>
                          </div>

                          <button
                            type="submit"
                            className="w-full mt-3 py-3.5 bg-[#FF9900] hover:bg-[#ffb86f] text-black font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-[#FF9900]/20 transition-all text-xs"
                          >
                            Enter Assessment Lobby
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STAGE 2: INTERMEDIATE DASHBOARD / ASSESSMENT LOBBY
           ═══════════════════════════════════════════════════════════ */}
        {stage === 'dashboard' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#FF9900]/10 border border-[#FF9900]/30 px-3 py-1 text-[11px] font-bold uppercase text-[#FF9900] tracking-widest mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
                  AWS STUDENT BUILDER GROUP
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
                  Cloud Intelligence Assessment
                </h1>
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-[#FF9900] mt-1">
                  <span>BUILD</span>
                  <span className="text-white/30">•</span>
                  <span>LEARN</span>
                  <span className="text-white/30">•</span>
                  <span>DEPLOY</span>
                </div>
              </div>
              <button
                onClick={handleLogoutParticipant}
                className="self-start sm:self-center text-xs text-[#dbc2ad] hover:text-white border border-white/10 px-4 py-2 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              >
                Switch Account
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Left Column: Student Profile & Gate Status */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                {/* Profile Card */}
                <div className="bg-[#12161f] border border-white/10 p-5 space-y-4">
                  <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#dbc2ad] uppercase tracking-wider">Candidate Profile</span>
                      <h3 className="text-base font-bold text-white mt-0.5 truncate">{participant.name}</h3>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded ${
                      participant.participantType === 'external'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {participant.participantType === 'external' ? 'External' : 'VIT Student'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider block">
                      {participant.participantType === 'external' ? 'Reg No. / Organization' : 'Registration No'}
                    </span>
                    <span className="text-sm font-bold text-[#FF9900]">{participant.regNo || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider block">Email Address</span>
                    <span className="text-xs text-[#dbc2ad] break-all leading-relaxed">{participant.email}</span>
                  </div>
                </div>

                {/* Status Gate Card or Already Attempted Card */}
                {existingSubmission ? (
                  <div className="p-6 border border-amber-500/40 bg-amber-950/20 text-center flex-1 flex flex-col justify-between items-center gap-4">
                    <div className="space-y-3">
                      <span className="material-symbols-outlined text-4xl text-amber-400 block">assignment_turned_in</span>
                      <h4 className="font-bold text-sm uppercase tracking-wider text-amber-300">ATTEMPT LIMIT REACHED (1/1)</h4>
                      <p className="text-xs leading-relaxed text-white/80">
                        You have already completed this assessment. Re-attempts are not permitted under examination policy.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResultData(existingSubmission);
                        setStage('result');
                      }}
                      className="w-full py-3.5 font-bold uppercase tracking-wider text-xs bg-[#FF9900] hover:bg-[#ffb86f] text-black shadow-lg shadow-[#FF9900]/20 cursor-pointer transition-all"
                    >
                      VIEW MY SUBMISSION REVIEW
                    </button>
                  </div>
                ) : (
                  <div
                    className={`p-6 border text-center flex-1 flex flex-col justify-between items-center gap-4 ${
                      quizInfo.isFrozen
                        ? 'bg-red-950/20 border-red-500/40 text-red-200'
                        : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    <div className="space-y-3">
                      <span className="material-symbols-outlined text-4xl block">
                        {quizInfo.isFrozen ? 'ac_unit' : 'rocket_launch'}
                      </span>
                      <h4 className="font-bold text-sm uppercase tracking-wider">
                        {quizInfo.isFrozen ? 'QUIZ STATUS: FROZEN' : 'QUIZ STATUS: LIVE & ACTIVE'}
                      </h4>
                      <p className="text-xs leading-relaxed text-white/80">
                        {quizInfo.isFrozen
                          ? 'The organizing committee has locked the assessment. Please wait on this screen—it will automatically activate once unfrozen.'
                          : 'The assessment is live and ready. Click below to begin your examination.'}
                      </p>
                    </div>

                    <button
                      onClick={handleStartQuiz}
                      disabled={quizInfo.isFrozen}
                      className={`w-full py-3.5 font-bold uppercase tracking-wider text-xs transition-all ${
                        quizInfo.isFrozen
                          ? 'bg-white/5 text-white/40 border border-white/10 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/30 cursor-pointer animate-pulse'
                      }`}
                    >
                      {quizInfo.isFrozen ? 'WAITING FOR ADMIN...' : 'START ASSESSMENT NOW'}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Rules & Clean Weightage Card + Security Instructions */}
              <div className="lg:col-span-2 bg-[#12161f] border border-white/10 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                  <div className="border-b border-white/10 pb-4">
                    <h3 className="text-lg font-bold text-white tracking-wide">Assessment Rules &amp; Guidelines</h3>
                    <p className="text-xs text-[#dbc2ad] mt-1">Please review the rules and security protocols before beginning.</p>
                  </div>

                  {/* Key Stats Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-white/3 p-4 border border-white/5">
                      <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block">Duration ({SECONDS_PER_QUESTION}s / Q)</span>
                      <span className="text-xl font-bold text-white">{quizInfo.durationMinutes} Minutes</span>
                    </div>
                    <div className="bg-white/3 p-4 border border-white/5">
                      <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block">Marking System</span>
                      <span className="text-xl font-bold text-[#a8e063]">1 Mark / Question</span>
                    </div>
                    <div className="bg-white/3 p-4 border border-white/5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block">Evaluation Weightage</span>
                      <span className="text-xl font-bold text-[#FF9900]">60% Acc + 40% Speed</span>
                    </div>
                  </div>

                  {/* Friendly Engaging Weightage Callout */}
                  <div className="p-4 bg-gradient-to-r from-white/3 via-white/5 to-transparent border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#FF9900] font-bold text-sm">
                      <span className="material-symbols-outlined text-lg">bolt</span>
                      <span>Accuracy &amp; Quickness Weightage</span>
                    </div>
                    <p className="leading-relaxed text-white/90">
                      Total duration is strictly <strong>30 seconds per question</strong>. Each question is worth <strong>1 Mark Total</strong>, split into <strong>0.6 for Correctness (60%)</strong> and <strong>0.4 for Speed (40%)</strong>.
                    </p>
                    <p className="text-[#dbc2ad] leading-relaxed">
                      💡 <em>Quickness scoring scales with each question you answer correctly. Fast answers combined with high accuracy maximize your speed bonus!</em>
                    </p>
                  </div>

                  {/* ── Strict Proctoring & Security Rules ── */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                      <span className="material-symbols-outlined text-sm">security</span>
                      <span>Strict Proctoring &amp; Examination Security Protocol</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Rule 1: Full-Screen */}
                      <div className="bg-red-950/20 border border-red-500/30 p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-red-300 font-bold">
                          <span className="material-symbols-outlined text-sm">fullscreen</span>
                          <span>Full-Screen Mode</span>
                        </div>
                        <p className="text-[11px] text-white/80 leading-relaxed">
                          Assessment must remain in full-screen. <strong>5 exits = Auto-submit</strong>.
                        </p>
                      </div>

                      {/* Rule 2: Right-Click */}
                      <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <span className="material-symbols-outlined text-sm">mouse</span>
                          <span>Right-Click Locked</span>
                        </div>
                        <p className="text-[11px] text-white/80 leading-relaxed">
                          Right-clicks &amp; inspect tools are disabled. <strong>5 attempts = Auto-submit</strong>.
                        </p>
                      </div>

                      {/* Rule 3: Tab Switch */}
                      <div className="bg-purple-950/20 border border-purple-500/30 p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                          <span className="material-symbols-outlined text-sm">tab</span>
                          <span>Tab Switches Monitored</span>
                        </div>
                        <p className="text-[11px] text-white/80 leading-relaxed">
                          Switching tabs/focus loss is tracked. <strong>3 tab switches = Auto-submit</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-white/40 border-t border-white/10 pt-4">
                  AWS Student Builder Group • Cloud Intelligence • Build, Learn, Deploy
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STAGE 3: ACTIVE ASSESSMENT ENGINE
           ═══════════════════════════════════════════════════════════ */}
        {stage === 'assessment' && currentQuestion && (
          <div className="min-h-screen flex flex-col">
            {/* Top Exam Header */}
            <header className="sticky top-0 z-30 bg-[#12161f] border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="bg-[#FF9900] text-black text-xs font-bold px-2 py-0.5 uppercase tracking-wider">AWS QUIZ</span>
                <span className="text-sm font-bold text-white hidden md:inline">{quizInfo.title}</span>
              </div>

              {/* Center: Proctoring Security Counters */}
              <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono">
                <span
                  className={`px-2 py-1 border flex items-center gap-1 ${
                    tabSwitchCount > 0 ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'bg-white/5 text-white/50 border-white/10'
                  }`}
                  title="Tab switches tracked (Max 3)"
                >
                  <span className="material-symbols-outlined text-xs">tab</span>
                  Tabs: {tabSwitchCount}/3
                </span>

                <span
                  className={`px-2 py-1 border flex items-center gap-1 ${
                    fullscreenExitCount > 0 ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'bg-white/5 text-white/50 border-white/10'
                  }`}
                  title="Full-screen exits (Max 5)"
                >
                  <span className="material-symbols-outlined text-xs">fullscreen_exit</span>
                  FS Exits: {fullscreenExitCount}/5
                </span>

                <span
                  className={`px-2 py-1 border flex items-center gap-1 ${
                    rightClickCount > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-white/5 text-white/50 border-white/10'
                  }`}
                  title="Right clicks (Max 5)"
                >
                  <span className="material-symbols-outlined text-xs">mouse</span>
                  RC: {rightClickCount}/5
                </span>
              </div>

              {/* Two Timers Display: Question Timer + Total Assessment Timer & Sole Submit Button */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* 1. Current Question Persistent Timer */}
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 border font-bold text-xs ${
                    (questionTimeMap[currentQuestion.id] ?? SECONDS_PER_QUESTION) <= 10
                      ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'
                      : 'bg-white/5 text-[#00a8e0] border-[#00a8e0]/40'
                  }`}
                  title={`Remaining time for this question (out of ${SECONDS_PER_QUESTION}s)`}
                >
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <div className="flex flex-col text-[10px] leading-tight">
                    <span className="text-white/50 text-[9px] uppercase font-mono">Q.{currentIndex + 1} Time</span>
                    <span className="text-xs font-bold">{formatTimer(questionTimeMap[currentQuestion.id] ?? SECONDS_PER_QUESTION)}</span>
                  </div>
                </div>

                {/* 2. Total Assessment Timer (Total questions × per-question seconds) */}
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 border font-bold text-xs ${
                    timeRemaining < 300
                      ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'
                      : 'bg-white/5 text-[#FF9900] border-[#FF9900]/40'
                  }`}
                  title="Total remaining time for entire assessment"
                >
                  <span className="material-symbols-outlined text-sm">hourglass_top</span>
                  <div className="flex flex-col text-[10px] leading-tight">
                    <span className="text-white/50 text-[9px] uppercase font-mono">Total Time</span>
                    <span className="text-xs font-bold">{formatTimer(timeRemaining)}</span>
                  </div>
                </div>

                {/* Sole Submit Button in Top Right */}
                <button
                  onClick={() => setSubmitConfirmOpen(true)}
                  className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow transition-all"
                >
                  Submit Assessment
                </button>
              </div>
            </header>

            {/* Main Assessment Body */}
            <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left: Question Card (3 cols) */}
              <div className="lg:col-span-3 flex flex-col justify-between bg-[#12161f] border border-white/10 p-6 md:p-8">
                <div>
                  {/* Expired Warning Banner */}
                  {isCurrentQuestionExpired && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 mb-6 font-mono">
                      <span className="material-symbols-outlined text-sm">lock_clock</span>
                      <span>Time for this question has expired (0s). Options and modifications are strictly locked.</span>
                    </div>
                  )}

                  {/* Question Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white/50">
                        Question {currentIndex + 1} of {questions.length} (1 Mark)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={toggleMarkForReview}
                      disabled={isCurrentQuestionExpired}
                      className={`px-3 py-1 text-xs border flex items-center gap-1 transition-colors ${
                        isCurrentQuestionExpired
                          ? 'opacity-40 cursor-not-allowed border-white/10 text-white/40'
                          : markedForReview[currentQuestion.id]
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 cursor-pointer'
                          : 'bg-white/5 text-[#dbc2ad] border-white/10 hover:bg-white/10 cursor-pointer'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">flag</span>
                      {markedForReview[currentQuestion.id] ? 'Marked for Review' : 'Mark for Review'}
                    </button>
                  </div>

                  {/* Question Body */}
                  {currentQuestion.question_type === 'assertion_reason' ? (
                    <div className="space-y-4 mb-8 bg-white/2 p-4 border border-white/5">
                      <div className="text-sm text-white leading-relaxed">
                        <strong className="text-[#FF9900]">Assertion (A):</strong> {currentQuestion.assertion}
                      </div>
                      <div className="text-sm text-white leading-relaxed">
                        <strong className="text-[#00a8e0]">Reason (R):</strong> {currentQuestion.reason}
                      </div>
                    </div>
                  ) : (
                    <div className="text-base text-white font-semibold leading-relaxed whitespace-pre-line mb-8">
                      {currentQuestion.question_text}
                    </div>
                  )}

                  {/* Answer Options */}
                  {(currentQuestion.question_type === 'mcq' || currentQuestion.question_type === 'assertion_reason') && (
                    <div className="space-y-3">
                      {(currentQuestion.options || [
                        'Both Assertion (A) and Reason (R) are true, and (R) is the correct explanation of (A).',
                        'Both Assertion (A) and Reason (R) are true, but (R) is NOT the correct explanation of (A).',
                        'Assertion (A) is true, but Reason (R) is false.',
                        'Assertion (A) is false, but Reason (R) is true.'
                      ]).map((opt, idx) => {
                        const isSelected = answers[currentQuestion.id] === opt;
                        return (
                          <button
                            type="button"
                            key={idx}
                            disabled={isCurrentQuestionExpired}
                            onClick={() => handleSelectMCQ(opt)}
                            className={`w-full p-4 text-left border flex items-center gap-3 transition-all ${
                              isCurrentQuestionExpired
                                ? isSelected
                                  ? 'bg-white/10 border-white/30 text-white/70 cursor-not-allowed opacity-70'
                                  : 'bg-white/2 border-white/5 text-white/30 cursor-not-allowed opacity-50'
                                : isSelected
                                ? 'bg-[#FF9900]/15 border-[#FF9900] text-white shadow-lg cursor-pointer'
                                : 'bg-white/2 border-white/10 text-white/80 hover:bg-white/5 cursor-pointer'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isSelected ? 'bg-[#FF9900] text-black' : 'bg-white/10 text-white/50'
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-xs sm:text-sm leading-snug">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Multi-Select */}
                  {currentQuestion.question_type === 'multi_select' && (
                    <div className="space-y-3">
                      <span className="text-[11px] text-[#a8e063] block mb-2 font-bold uppercase">
                        Select all correct options:
                      </span>
                      {(currentQuestion.options || []).map((opt, idx) => {
                        const selectedList = Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] : [];
                        const isSelected = selectedList.includes(opt);

                        return (
                          <button
                            type="button"
                            key={idx}
                            disabled={isCurrentQuestionExpired}
                            onClick={() => handleToggleMultiSelect(opt)}
                            className={`w-full p-4 text-left border flex items-center gap-3 transition-all ${
                              isCurrentQuestionExpired
                                ? isSelected
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200/60 cursor-not-allowed opacity-70'
                                  : 'bg-white/2 border-white/5 text-white/30 cursor-not-allowed opacity-50'
                                : isSelected
                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-200 shadow-lg cursor-pointer'
                                : 'bg-white/2 border-white/10 text-white/80 hover:bg-white/5 cursor-pointer'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                                isSelected ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/50'
                              }`}
                            >
                              {isSelected ? '✓' : String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-xs sm:text-sm leading-snug">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Objective */}
                  {currentQuestion.question_type === 'objective' && (
                    <div className="space-y-2">
                      <label className="text-xs text-[#dbc2ad] block font-bold uppercase tracking-wider">
                        Type Your Answer Below:
                      </label>
                      <input
                        type="text"
                        placeholder="Type answer here..."
                        disabled={isCurrentQuestionExpired}
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleObjectiveChange(e.target.value)}
                        className={`w-full bg-white/5 border p-4 text-sm focus:outline-none transition-colors ${
                          isCurrentQuestionExpired
                            ? 'border-white/10 text-white/40 cursor-not-allowed opacity-60'
                            : 'border-white/20 text-white focus:border-[#FF9900]'
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Navigation Footer */}
                <div className="flex items-center justify-between border-t border-white/10 pt-6 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      const prevIdx = getPrevUnexpiredIndex();
                      if (prevIdx !== -1) setCurrentIndex(prevIdx);
                    }}
                    disabled={getPrevUnexpiredIndex() === -1}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title={getPrevUnexpiredIndex() === -1 ? 'No previous active questions available' : 'Navigate to previous unexpired question'}
                  >
                    ← Previous
                  </button>

                  <button
                    type="button"
                    disabled={isCurrentQuestionExpired}
                    onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: undefined }))}
                    className="text-[11px] text-white/40 hover:text-red-400 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Clear Response
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = getNextUnexpiredIndex();
                      if (nextIdx !== -1) setCurrentIndex(nextIdx);
                    }}
                    disabled={getNextUnexpiredIndex() === -1}
                    className="px-5 py-2.5 bg-[#FF9900] hover:bg-[#ffb86f] text-black font-bold text-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title={getNextUnexpiredIndex() === -1 ? 'No next active questions available' : 'Navigate to next unexpired question'}
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Right: Question Palette */}
              <div className="lg:col-span-1 bg-[#12161f] border border-white/10 p-5 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-[#dbc2ad] uppercase tracking-wider border-b border-white/10 pb-2 mb-3">
                    Question Palette
                  </h3>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, idx) => {
                      const isAnswered =
                        answers[q.id] !== undefined &&
                        answers[q.id] !== null &&
                        answers[q.id] !== '' &&
                        !(Array.isArray(answers[q.id]) && answers[q.id].length === 0);
                      const isReview = markedForReview[q.id];
                      const isCurrent = currentIndex === idx;
                      const qRemaining = questionTimeMap[q.id] !== undefined ? questionTimeMap[q.id] : (quizInfo.secondsPerQuestion || SECONDS_PER_QUESTION);
                      const isExpired = qRemaining <= 0;

                      return (
                        <button
                          type="button"
                          key={q.id}
                          disabled={isExpired}
                          onClick={() => {
                            if (!isExpired) setCurrentIndex(idx);
                          }}
                          title={isExpired ? `Question ${idx + 1}: Time Expired (Locked)` : `Question ${idx + 1} (${qRemaining}s remaining)`}
                          className={`w-full aspect-square flex flex-col items-center justify-center font-bold text-xs border transition-all ${
                            isCurrent
                              ? 'ring-2 ring-[#FF9900] border-[#FF9900]'
                              : ''
                          } ${
                            isExpired
                              ? 'bg-red-950/20 text-red-400/40 border-red-500/20 cursor-not-allowed opacity-50'
                              : isAnswered
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 cursor-pointer hover:bg-emerald-500/30'
                              : isReview
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 cursor-pointer hover:bg-purple-500/30'
                              : 'bg-white/3 text-white/50 border-white/5 hover:bg-white/10 cursor-pointer'
                          }`}
                        >
                          <span>{idx + 1}</span>
                          {isExpired && <span className="text-[8px] text-red-400 leading-none">🔒</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Palette Legend */}
                <div className="space-y-2 text-[11px] border-t border-white/10 pt-4 text-[#dbc2ad]">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-500/40 border border-emerald-500 rounded-sm" />
                    <span>Answered ({answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500/40 border border-purple-500 rounded-sm" />
                    <span>Marked for Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-white/10 border border-white/20 rounded-sm" />
                    <span>Unanswered ({questions.length - answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-950/40 border border-red-500/40 rounded-sm flex items-center justify-center text-[8px] text-red-400">🔒</span>
                    <span>Locked / Timed Out (0s)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STAGE 4: INSTANT RESULTS & WINNER REPORT
           ═══════════════════════════════════════════════════════════ */}
        {stage === 'result' && (
          !resultData ? (
            <div className="max-w-md mx-auto my-24 p-8 bg-[#12161f] border border-white/10 text-center space-y-4 font-mono">
              <span className="material-symbols-outlined text-4xl text-[#FF9900] animate-spin">refresh</span>
              <h3 className="text-base font-bold text-white">Loading Assessment Record...</h3>
              <p className="text-xs text-[#dbc2ad]">Retrieving your verified submission from the database.</p>
              <button
                type="button"
                onClick={() => participant?.email && checkExistingAttempt(participant.email)}
                className="px-4 py-2 bg-white/10 text-xs text-white border border-white/20 hover:bg-white/20 cursor-pointer"
              >
                Reload Submission
              </button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
              {proctoringViolationReason ? (
                <div className="p-5 bg-red-950/90 border-2 border-red-500 text-red-200 text-sm flex items-start gap-3 shadow-2xl">
                  <span className="material-symbols-outlined text-red-400 text-2xl shrink-0 mt-0.5 animate-pulse">
                    gpp_bad
                  </span>
                  <div className="space-y-1">
                    <div className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
                      <span className="bg-red-600 text-white px-2 py-0.5 text-[10px] font-mono">ASSESSMENT AUTO-SUBMITTED</span>
                      <span>Security Protocol Violation</span>
                    </div>
                    <p className="text-red-100 text-xs sm:text-sm font-mono leading-relaxed">
                      {proctoringViolationReason}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-base">verified</span>
                    <span>Assessment successfully submitted and verified. Only one attempt is permitted per participant.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogoutParticipant}
                    className="text-[10px] text-white/50 hover:text-white underline cursor-pointer"
                  >
                    Switch Account
                  </button>
                </div>
              )}

              <div className="bg-[#12161f] border border-white/10 p-8 text-center relative overflow-hidden">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-xs uppercase tracking-widest mb-4">
                  <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                  Assessment Submission Review
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">{resultData.participant_name || participant.name}</h1>
                <p className="text-xs text-[#dbc2ad]">Reg: {resultData.participant_reg_no || participant.regNo} | {resultData.participant_email || participant.email}</p>

                {/* Score Grid (1-Mark System) - only once an admin releases results */}
                {!resultData.resultsReleased ? (
                  <div className="mt-8 p-6 border border-[#FF9900]/30 bg-[#FF9900]/5">
                    <span className="material-symbols-outlined text-3xl text-[#FF9900]">hourglass_top</span>
                    <p className="mt-3 text-base font-semibold text-white">Your responses have been recorded</p>
                    <p className="mt-2 text-xs text-[#dbc2ad] leading-relaxed">
                      Marks and the answer review will be published by the organisers. Come back to this page with the same
                      account once results are announced.
                    </p>
                    <p className="mt-3 text-[11px] text-white/40">
                      Submitted on {resultData.submitted_at ? new Date(resultData.submitted_at).toLocaleString() : '-'}
                    </p>
                  </div>
                ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                  <div className="bg-white/3 p-4 border border-white/10">
                    <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block">Final Score</span>
                    <span className="text-2xl font-bold text-[#a8e063]">{Number(resultData.score || 0).toFixed(2)} / {Number(resultData.total_marks || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-white/3 p-4 border border-white/10">
                    <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block">Correctness (60%)</span>
                    <span className="text-2xl font-bold text-[#FF9900]">+{Number(resultData.accuracy_score || 0).toFixed(2)} pts</span>
                  </div>
                  <div className="bg-white/3 p-4 border border-white/10">
                    <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block">Speed Bonus (40%)</span>
                    <span className="text-2xl font-bold text-[#00a8e0]">+{Number(resultData.speed_score || 0).toFixed(2)} pts</span>
                  </div>
                  <div className="bg-white/3 p-4 border border-white/10">
                    <span className="text-[10px] text-[#dbc2ad] uppercase tracking-wider block">Time Taken</span>
                    <span className="text-2xl font-bold text-white">
                      {Math.floor((resultData.time_taken_seconds || 0) / 60)}m {(resultData.time_taken_seconds || 0) % 60}s
                    </span>
                  </div>
                </div>
                )}
              </div>

              {/* Full paper review: correct option in green, a wrong pick in red */}
              {resultData.resultsReleased && review.length > 0 && (
                <div className="bg-[#12161f] border border-white/10 p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Answer Review</h3>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1.5 text-emerald-300">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60 border border-emerald-400" /> Correct answer
                      </span>
                      <span className="flex items-center gap-1.5 text-red-300">
                        <span className="w-2.5 h-2.5 rounded-sm bg-red-500/60 border border-red-400" /> Your wrong answer
                      </span>
                    </div>
                  </div>

                  {review.map((item) => {
                    const answerText = (value) => (Array.isArray(value) ? value.join(', ') : String(value ?? ''));
                    const matches = (value, option) => {
                      const target = String(option).trim().toLowerCase();
                      if (Array.isArray(value)) return value.some((a) => String(a).trim().toLowerCase() === target);
                      return String(value ?? '').trim().toLowerCase() === target;
                    };
                    return (
                      <article key={item.questionId ?? item.number} className="border border-white/10 bg-black/30 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-white">Question {item.number}</span>
                          <span className={`text-[10px] px-2 py-0.5 border font-bold uppercase tracking-wider ${
                            item.isCorrect
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : item.isAnswered
                              ? 'border-red-500/40 bg-red-500/10 text-red-300'
                              : 'border-white/15 bg-white/5 text-white/50'
                          }`}>
                            {item.isCorrect ? 'Correct - 0.6 pts' : item.isAnswered ? 'Incorrect - 0 pts' : 'Unanswered - 0 pts'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 border border-white/10 text-white/50 uppercase">{item.difficulty}</span>
                        </div>

                        {item.assertion ? (
                          <div className="mt-3 space-y-2 text-sm">
                            <p className="text-white/90"><strong className="text-[#FF9900]">Assertion (A):</strong> {item.assertion}</p>
                            <p className="text-white/90"><strong className="text-[#00a8e0]">Reason (R):</strong> {item.reason}</p>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{item.questionText}</p>
                        )}

                        {item.options.length > 0 ? (
                          <ul className="mt-4 space-y-2">
                            {item.options.map((option, oIdx) => {
                              const right = matches(item.correctAnswer, option);
                              const wrongPick = matches(item.userAnswer, option) && !right;
                              return (
                                <li key={oIdx} className={`flex items-start gap-3 p-3 border text-sm ${
                                  right
                                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                                    : wrongPick
                                    ? 'border-red-500/50 bg-red-500/10 text-red-100'
                                    : 'border-white/10 bg-white/2 text-white/70'
                                }`}>
                                  <span className="font-bold text-xs mt-0.5">{String.fromCharCode(65 + oIdx)}.</span>
                                  <span className="flex-1 leading-relaxed">{option}</span>
                                  {right && <span className="text-[10px] font-bold uppercase text-emerald-300 whitespace-nowrap">Correct</span>}
                                  {wrongPick && <span className="text-[10px] font-bold uppercase text-red-300 whitespace-nowrap">Your answer</span>}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <div className="mt-4 space-y-2 text-sm">
                            <p className={item.isCorrect ? 'text-emerald-200' : 'text-red-200'}>
                              Your answer: <strong>{answerText(item.userAnswer) || 'Not answered'}</strong>
                            </p>
                            <p className="text-emerald-200">Correct answer: <strong>{answerText(item.correctAnswer)}</strong></p>
                          </div>
                        )}

                        {item.options.length > 0 && !item.isAnswered && (
                          <p className="mt-3 text-[11px] text-white/50">You did not answer this question.</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Return to Home Action Button */}
              <div className="flex flex-col items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => navigate('/')}
                  className="px-8 py-3.5 bg-[#FF9900] hover:bg-[#ffb86f] text-black font-bold uppercase tracking-wider text-xs cursor-pointer shadow-lg shadow-[#FF9900]/20 flex items-center gap-2 transition-all"
                >
                  <span>Explore more of AWS SBG VIT</span>
                  <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                </button>
                <p className="text-[11px] text-[#dbc2ad]/80">Return to the official club portal &amp; events</p>
              </div>
            </div>
          )
        )}

        {/* ═══════════════════════════════════════════════════════════
            PROCTORING WARNING MODAL (FULLSCREEN / TAB SWITCH)
           ═══════════════════════════════════════════════════════════ */}
        {warningModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#12161f] border-2 border-red-500/80 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-xs text-center font-mono">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-red-400 uppercase tracking-wide">
                {warningModal.title}
              </h2>

              <p className="text-white/90 leading-relaxed text-xs sm:text-sm">
                {warningModal.message}
              </p>

              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 font-bold uppercase tracking-wider">
                Warning Count: {warningModal.count} of {warningModal.max} (Exceeding {warningModal.max} will auto-submit test)
              </div>

              <button
                type="button"
                onClick={() => {
                  setWarningModal(null);
                  requestFullScreenMode();
                }}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest text-xs cursor-pointer shadow-lg shadow-red-600/30 transition-all"
              >
                I Understand &amp; Resume Full-Screen
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PROCTORING FLOATING WARNING TOAST (RIGHT-CLICK)
           ═══════════════════════════════════════════════════════════ */}
        {warningToast && (
          <div className="fixed top-20 right-6 z-50 bg-red-950/95 border border-red-500 px-5 py-3 text-red-200 font-mono text-xs shadow-2xl flex items-center gap-2 animate-bounce">
            <span className="material-symbols-outlined text-base text-red-400">gpp_bad</span>
            <span>{warningToast.message}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODAL: SUBMIT CONFIRMATION
           ═══════════════════════════════════════════════════════════ */}
        {submitConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#12161f] border border-white/20 p-6 max-w-md w-full shadow-2xl space-y-5 text-xs font-mono">
              <div className="flex items-center gap-2 text-[#FF9900] font-bold text-sm">
                <span className="material-symbols-outlined">help</span>
                Confirm Assessment Submission
              </div>
              <p className="text-[#dbc2ad]">
                Are you sure you want to submit your responses? Your score will be evaluated instantly.
              </p>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/3 p-3 border border-white/5">
                  <span className="text-[10px] text-[#dbc2ad] block">Answered</span>
                  <span className="text-base font-bold text-emerald-400">{answeredCount}</span>
                </div>
                <div className="bg-white/3 p-3 border border-white/5">
                  <span className="text-[10px] text-[#dbc2ad] block">Unanswered</span>
                  <span className="text-base font-bold text-red-400">{questions.length - answeredCount}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitConfirmOpen(false)}
                  className="px-4 py-2 border border-white/20 text-[#dbc2ad] hover:text-white cursor-pointer"
                >
                  Continue Quiz
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleFinalSubmit(false)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
