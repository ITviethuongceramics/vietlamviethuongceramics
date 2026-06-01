import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './CandidateTestPage.scss';
import TypingTest from './TypingTest';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api$/, '');
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('candidate_token')}`
});

const MAX_VIOLATIONS = 2;
const TAB_OUT_TIMEOUT_MS = 30000;

// ──────────────────────────────────────────────────────────────
// Shuffle helpers
// ──────────────────────────────────────────────────────────────

/** Fisher-Yates — trả về mảng mới, không mutate */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Shuffle câu hỏi + đáp án cho ứng viên.
 * - Thứ tự câu hỏi bị xáo trộn
 * - Với multiple_choice / multi_select:
 *   + Thứ tự đáp án bị xáo trộn
 *   + Key hiển thị (A/B/C/D) được gán lại theo thứ tự mới
 *   + Mỗi option giữ thêm `original_key` để map câu trả lời về key gốc khi submit
 * - Câu typing_sample KHÔNG shuffle (thứ tự gõ không xáo trộn được)
 */

function buildShuffledTest(questions) {
  const FIXED_TYPES = ['typing_sample', 'speaking', 'short_answer', 'reading'];

  const fixedMap = {};
  const shufflable = [];

  questions.forEach((q, i) => {
    if (FIXED_TYPES.includes(q.question_type)) {
      fixedMap[i] = q;
    } else {
      shufflable.push(q);
    }
  });

 const shuffled = shuffleArray(shufflable).map(q => {
  if (!q.options) return q;

  const originalOptions = typeof q.options === 'string'
    ? JSON.parse(q.options)
    : q.options;

  if (!Array.isArray(originalOptions) || originalOptions.length === 0) return q;

  // 👇 THÊM DÒNG NÀY ĐỂ XEM DATA THỰC TẾ
  console.log('options raw:', JSON.stringify(originalOptions));

  const keys = ['A', 'B', 'C', 'D', 'E', 'F'];
  const shuffledOpts = shuffleArray(originalOptions).map((opt, idx) => ({
    key:          keys[idx],
    text:         opt.text,
    original_key: opt.key ?? keys[idx],
  }));

  return { ...q, options: shuffledOpts };
});
  // Ghép lại: fixed giữ đúng vị trí gốc, còn lại điền từ shuffled
  const result = [];
  let cursor = 0;
  for (let i = 0; i < questions.length; i++) {
    if (fixedMap[i]) {
      result.push(fixedMap[i]);
    } else {
      result.push(shuffled[cursor++]);
    }
  }

  return result;
}

function mapAnswerToOriginal(question, displayAnswer) {
  if (
    !displayAnswer ||
    !['multiple_choice', 'multi_select'].includes(question.question_type) ||
    !question.options
  ) {
    return displayAnswer;
  }

  // Kiểm tra options có original_key không (tức là đã shuffle)
  const hasOriginalKey = question.options.some(o => o.original_key);
  if (!hasOriginalKey) return displayAnswer;

  // multiple_choice: displayAnswer = "A"
  // multi_select:    displayAnswer = "A,C"
  const displayKeys = displayAnswer.split(',').map(k => k.trim());
  const originalKeys = displayKeys.map(dk => {
    const opt = question.options.find(o => o.key === dk);
    return opt?.original_key ?? dk;
  });

  return originalKeys.sort().join(',');
}

// ──────────────────────────────────────────────────────────────
// Anti-cheat hook
// ──────────────────────────────────────────────────────────────
function useAntiCheat({ assignmentId, onForceSubmit, isRequestingMic, isSubmitting }) {
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [forceSubmit, setForceSubmit] = useState(false);

  const violationsRef = useRef(0);
  const tabOutTimer   = useRef(null);
  const isHidden      = useRef(false);
  const forcedRef     = useRef(false);

  const triggerForceSubmit = useCallback((reason) => {
    if (forcedRef.current) return;
    forcedRef.current = true;

    const locked = JSON.parse(localStorage.getItem('locked_assignments') || '[]');
    if (!locked.includes(String(assignmentId))) {
      locked.push(String(assignmentId));
      localStorage.setItem('locked_assignments', JSON.stringify(locked));
    }

    fetch(`${API}/api/candidate/assignments/${assignmentId}/lock`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ reason }),
    }).catch(() => {});

    setForceSubmit(true);
    setWarningMsg('⛔ Bài thi đã bị khoá!\nBài sẽ được nộp tự động sau 3 giây.');
    setShowWarning(true);
    setTimeout(() => onForceSubmit?.(), 3000);
  }, [assignmentId, onForceSubmit]);

  const recordViolation = useCallback(async (reason) => {
    if (forcedRef.current) return;

    violationsRef.current += 1;
    const count = violationsRef.current;
    setViolations(count);

    try {
      await fetch(`${API}/api/candidate/assignments/${assignmentId}/violations`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ reason, count }),
      });
    } catch { /* silent */ }

    if (count >= MAX_VIOLATIONS) {
      triggerForceSubmit(`max_violations_${count}`);
    } else {
      setWarningMsg(
        `⚠️ Cảnh báo lần ${count}: Bạn vừa rời khỏi trang thi!\n\n` +
        `Rời thêm 1 lần nữa hoặc rời quá 5 giây sẽ bị khoá bài và nộp tự động.`
      );
      setShowWarning(true);
    }
  }, [assignmentId, triggerForceSubmit]);

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      recordViolation('browser_back');
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (isHidden.current) return;
        if (isRequestingMic.current) return;
        if (isSubmitting?.current) return;
        isHidden.current = true;
        tabOutTimer.current = setTimeout(() => triggerForceSubmit('tab_out_5s'), TAB_OUT_TIMEOUT_MS);
        recordViolation('tab_switch');
      } else {
        isHidden.current = false;
        if (tabOutTimer.current) { clearTimeout(tabOutTimer.current); tabOutTimer.current = null; }
      }
    };
    const handleBlur = () => {
      if (isHidden.current) return;
      if (isRequestingMic.current) return;
      if (isSubmitting?.current) return;
      isHidden.current = true;
      tabOutTimer.current = setTimeout(() => triggerForceSubmit('blur_5s'), TAB_OUT_TIMEOUT_MS);
      recordViolation('window_blur');
    };
    const handleFocus = () => {
      isHidden.current = false;
      if (tabOutTimer.current) { clearTimeout(tabOutTimer.current); tabOutTimer.current = null; }
    };
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'u')
      ) e.preventDefault();
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      if (tabOutTimer.current) clearTimeout(tabOutTimer.current);
    };
  }, [recordViolation, triggerForceSubmit]);

  return { violations, showWarning, setShowWarning, warningMsg, forceSubmit, isRequestingMic };
}

// ── Warning Overlay ───────────────────────────────────────────
function WarningOverlay({ msg, violations, forceSubmit, onClose }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (forceSubmit || countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, forceSubmit]);

  useEffect(() => {
    document.body.style.overflow    = 'hidden';
    document.body.style.userSelect  = 'none';
    return () => {
      document.body.style.overflow   = '';
      document.body.style.userSelect = '';
    };
  }, []);

  return (
    <div
      className={`ct-warning-overlay ${forceSubmit ? 'ct-warning-overlay--critical' : ''}`}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <div className="ct-warning-box" onClick={e => e.stopPropagation()}>
        <div className="ct-warning-icon">{forceSubmit ? '🚫' : '⚠️'}</div>
        <div className="ct-warning-title">
          {forceSubmit ? 'Bài thi đã bị khoá' : `Cảnh báo vi phạm (${violations}/${MAX_VIOLATIONS})`}
        </div>
        <div className="ct-warning-msg">{msg}</div>
        <div className="ct-warning-counter">
          <span>Lần vi phạm:</span>
          {Array.from({ length: MAX_VIOLATIONS }).map((_, i) => (
            <span key={i} className={`ct-dot ${i < violations ? 'ct-dot--filled' : ''}`} />
          ))}
        </div>
        {!forceSubmit && (
          <>
            <div className="ct-countdown">
              <div className="ct-countdown__bar">
                <div className="ct-countdown__fill" style={{ width: `${((5 - countdown) / 5) * 100}%` }} />
              </div>
              <span className="ct-countdown__label">
                {countdown > 0 ? `Hãy đọc kỹ cảnh báo... (${countdown}s)` : '✓ Bạn có thể tiếp tục'}
              </span>
            </div>
            <button className="ct-warning-btn" onClick={onClose} disabled={countdown > 0}>
              {countdown > 0 ? `Chờ ${countdown}s...` : 'Tôi hiểu, tiếp tục làm bài'}
            </button>
          </>
        )}
        {forceSubmit && <div className="ct-warning-submitting">⏳ Đang nộp bài tự động...</div>}
      </div>
    </div>
  );
}

// ── Timer ────────────────────────────────────────────────────
function Timer({ seconds, onExpire }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) { onExpire?.(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const m = Math.floor(left / 60).toString().padStart(2, '0');
  const s = (left % 60).toString().padStart(2, '0');
  return <div className={`ct-timer ${left < 120 ? 'ct-timer--urgent' : ''}`}>{m}:{s}</div>;
}

// ── SpeakingQuestion ──────────────────────────────────────────
function SpeakingQuestion({ question, assignmentId, onRecorded, isRequestingMic }) {
  const [status, setStatus]   = useState('idle');
  const [errMsg, setErrMsg]   = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);

  const uploadAudio = async (blob, type) => {
    try {
      const ext  = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      const form = new FormData();
      form.append('audio', blob, `speaking.${ext}`);
      const r = await fetch(
        `${API}/api/grading/assignments/${assignmentId}/speaking/${question.id}`,
        { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('candidate_token')}` }, body: form }
      );
      const d = await r.json();
      if (r.ok) { setStatus('done'); onRecorded(question.id, d.audio_url); }
      else { setErrMsg(d.message); setStatus('error'); }
    } catch {
      setErrMsg('Lỗi upload audio. Vui lòng thử lại.');
      setStatus('error');
    }
  };

  const startRecord = async () => {
    setErrMsg('');
    if (typeof MediaRecorder === 'undefined') {
      setErrMsg('Trình duyệt không hỗ trợ thu âm. Vui lòng dùng Safari iOS 14.3+ hoặc Chrome.');
      setStatus('error'); return;
    }
    if (isRequestingMic) isRequestingMic.current = true;
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (isRequestingMic) isRequestingMic.current = false;
      const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', '']
        .find(t => t === '' || MediaRecorder.isTypeSupported(t));
      let mr;
      try { mr = new MediaRecorder(stream, mimeType ? { mimeType } : {}); }
      catch { mr = new MediaRecorder(stream); }
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const actualType = mr.mimeType || mimeType || 'audio/mp4';
        const blob = new Blob(chunksRef.current, { type: actualType });
        setAudioUrl(URL.createObjectURL(blob));
        await uploadAudio(blob, actualType);
      };
      mediaRef.current = mr;
      mr.start();
      setStatus('recording');
    } catch (err) {
      if (isRequestingMic) isRequestingMic.current = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        setErrMsg('Bạn chưa cấp quyền microphone. Vào Cài đặt > Safari > Microphone để bật.');
      else if (err.name === 'NotFoundError')
        setErrMsg('Không tìm thấy microphone trên thiết bị.');
      else if (err.name === 'NotSupportedError')
        setErrMsg('Trình duyệt không hỗ trợ thu âm. Vui lòng dùng Safari iOS 14.3+ hoặc Chrome.');
      else
        setErrMsg(`Lỗi: ${err.message || 'Không thể khởi động thu âm. Thử lại.'}`);
      setStatus('error');
    }
  };

  const stopRecord = () => { mediaRef.current?.stop(); setStatus('uploading'); };

  return (
    <div className="ct-speaking">
      {question.speaking_prompt && (
        <div className="ct-speaking__prompt">
          <span className="ct-speaking__prompt-label">Chủ đề:</span>
          {question.speaking_prompt}
        </div>
      )}
      <div className="ct-speaking__controls">
        {status === 'idle' && (
          <button className="ct-rec-btn ct-rec-btn--start" onClick={startRecord}>
            <span className="ct-rec-dot" /> Bắt đầu thu âm
          </button>
        )}
        {status === 'recording' && (
          <button className="ct-rec-btn ct-rec-btn--stop" onClick={stopRecord}>
            <span className="ct-rec-dot ct-rec-dot--pulse" /> Dừng thu âm
          </button>
        )}
        {status === 'uploading' && <div className="ct-speaking__status">Đang upload...</div>}
        {status === 'done' && (
          <div className="ct-speaking__done">
            <span className="ct-check">✓</span> Đã ghi âm thành công
            {audioUrl && <audio controls src={audioUrl} className="ct-audio" />}
            <button className="ct-rec-btn ct-rec-btn--redo"
              onClick={() => { setStatus('idle'); setAudioUrl(null); }}>
              Ghi lại
            </button>
          </div>
        )}
        {status === 'error' && (
          <div className="ct-speaking__error">
            {errMsg}
            <button className="ct-rec-btn ct-rec-btn--start" onClick={() => setStatus('idle')}>
              Thử lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Trang danh sách bài test
// ============================================================
export function CandidateTestListPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [name]    = useState(localStorage.getItem('candidate_name') || '');
  const navigate  = useNavigate();
  const [lockedIds, setLockedIds] = useState(
    () => JSON.parse(localStorage.getItem('locked_assignments') || '[]')
  );

  useEffect(() => {
    if (!localStorage.getItem('candidate_token')) { navigate('/candidate'); return; }
fetch(`${API}/api/candidate/assignments`, { headers: headers() })
  .then(r => r.json())
  .then(d => {
    setAssignments(Array.isArray(d) ? d : []);
    setLoading(false);

    // Sync locked_assignments theo server (không chỉ thêm mà còn xóa)
    const serverLocked = (Array.isArray(d) ? d : [])
      .filter(a => a.is_locked)
      .map(a => String(a.assignment_id));

    localStorage.setItem('locked_assignments', JSON.stringify(serverLocked));
    setLockedIds(serverLocked);
  })
  .catch(() => setLoading(false));
  }, []);

  const statusLabel = {
    pending:     { text: 'Chưa làm',    cls: 'pending'   },
    in_progress: { text: 'Đang làm',    cls: 'progress'  },
    submitted:   { text: 'Đã nộp',      cls: 'submitted' },
    graded:      { text: 'Đã chấm',     cls: 'graded'    },
    expired:     { text: 'Hết hạn',     cls: 'expired'   },
  };
  const typeLabel = {
    excel_word: 'Excel / Word', typing: 'Đánh máy',
    english:    'Tiếng Anh',    chinese: 'Tiếng Trung', custom: 'Tùy chỉnh',
  };

  const logout = () => {
    ['candidate_token', 'candidate_name', 'candidate_email'].forEach(k => localStorage.removeItem(k));
    navigate('/candidate');
  };

  const isLocked = id => lockedIds.includes(String(id));

  return (
    <div className="ct-list-page">
      <header className="ct-list-header">
        <div className="ct-list-header__info">
          <span className="ct-list-header__name">Xin chào, {name}</span>
          <span className="ct-list-header__sub">Danh sách bài test của bạn</span>
        </div>
        <button className="ct-logout-btn" onClick={logout}>Đăng xuất</button>
      </header>

      {loading ? <div className="ct-loading">Đang tải...</div>
        : assignments.length === 0 ? (
          <div className="ct-empty">
            <div className="ct-empty__icon">📋</div>
            <div>Bạn chưa được phân công bài test nào.</div>
            <div className="ct-empty__sub">Vui lòng liên hệ HR để biết thêm thông tin.</div>
          </div>
        ) : (
          <div className="ct-cards">
            {assignments.map(a => {
              const st      = statusLabel[a.status] || { text: a.status, cls: '' };
              const locked  = isLocked(a.assignment_id);
              const canDo   = ['pending', 'in_progress'].includes(a.status) && !locked;
              const blocked = ['pending', 'in_progress'].includes(a.status) && locked;
              return (
                <div key={a.assignment_id} className={`ct-test-card ${locked ? 'ct-test-card--locked' : ''}`}>
                  <div className="ct-test-card__head">
                    <span className="ct-type-tag">{typeLabel[a.type] || a.type}</span>
                    <span className={`ct-status ct-status--${locked ? 'locked' : st.cls}`}>
                      {locked ? '🔒 Bị khóa' : st.text}
                    </span>
                  </div>
                  <h3 className="ct-test-card__title">{a.title}</h3>
                  <div className="ct-test-card__meta">
                    <span>{a.time_limit} phút</span>
                    <span>Đạt: {a.passing_score}%</span>
                    {a.deadline && <span>Hạn: {new Date(a.deadline).toLocaleDateString('vi-VN')}</span>}
                  </div>
                  {a.status === 'graded' && a.percentage != null && (
                    <div className={`ct-result-bar ${a.passed ? 'pass' : 'fail'}`}>
                      <span className="ct-result-pct">{a.percentage}%</span>
                      <span>{a.passed ? '✓ Đạt yêu cầu' : ' Chưa đạt'}</span>
                    </div>
                  )}
                  {a.status === 'submitted' && (
                    <div className="ct-result-bar pending">Đang chờ chấm điểm...</div>
                  )}
                  <div className="ct-test-card__actions">
                    {blocked && <div className="ct-locked-badge">🔒 Bài thi bị khóa do vi phạm quy định</div>}
                    {canDo && (
                      <button className="ct-start-btn"
                        onClick={() => navigate(`/candidate/tests/${a.assignment_id}`)}>
                        {a.status === 'in_progress' ? 'Tiếp tục làm bài' : 'Bắt đầu làm bài'}
                      </button>
                    )}
                    {a.status === 'graded' && (
                      <button className="ct-start-btn ct-start-btn--outline"
                        onClick={() => navigate(`/candidate/tests/${a.assignment_id}/result`)}>
                        Xem kết quả
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ============================================================
// Trang làm bài test
// ============================================================
export default function CandidateTestPage() {
  const { assignment_id } = useParams();
  const navigate = useNavigate();

  // test lưu data đã shuffle — không bao giờ thay đổi sau khi set
  const [test, setTest]         = useState(null);
  const [answers, setAnswers]   = useState({});
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isRequestingMic = useRef(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    isSubmittingRef.current = true;
    try {
      // Map câu trả lời về key gốc trước khi submit
      const answerList = Object.entries(answers).map(([question_id, displayAnswer]) => {
        const question = test?.questions?.find(q => String(q.id) === String(question_id));
        const originalAnswer = question
          ? mapAnswerToOriginal(question, displayAnswer)
          : displayAnswer;
        return { question_id: parseInt(question_id), answer: originalAnswer };
      });

      const r = await fetch(`${API}/api/candidate/assignments/${assignment_id}/submit`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ answers: answerList })
      });
      const d = await r.json();
      if (r.ok) {
        setSubmitted(true);
        fetch(`${API}/api/grading/assignments/${assignment_id}/grade`, {
          method: 'POST', headers: headers()
        }).catch(() => {});
      } else {
        setError(d.message);
      }
    } catch {
      setError('Lỗi kết nối');
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [answers, assignment_id, submitting, test]);

  const { violations, showWarning, setShowWarning, warningMsg, forceSubmit } =
    useAntiCheat({ assignmentId: assignment_id, onForceSubmit: handleSubmit, isRequestingMic, isSubmitting: isSubmittingRef });

  useEffect(() => {
    if (!localStorage.getItem('candidate_token')) { navigate('/candidate'); return; }


    fetch(`${API}/api/candidate/assignments/${assignment_id}/start`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        if (d.is_locked) {
          const cur = JSON.parse(localStorage.getItem('locked_assignments') || '[]');
          if (!cur.includes(String(assignment_id))) {
            cur.push(String(assignment_id));
            localStorage.setItem('locked_assignments', JSON.stringify(cur));
          }
          setError('Bài thi này đã bị khóa do vi phạm quy định. Vui lòng liên hệ HR.');
          setLoading(false); return;
        }
        if (d.message && !d.questions) { setError(d.message); setLoading(false); return; }

        // ── Shuffle câu hỏi + đáp án ngay sau khi nhận data ──
        const shuffled = {
          ...d,
          questions: d.questions ? buildShuffledTest(d.questions) : [],
        };
        setTest(shuffled);
        setLoading(false);
      })
      .catch(() => { setError('Không thể tải bài test'); setLoading(false); });
  }, [assignment_id]);

  const setAnswer = useCallback((qid, value) => {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  }, []);

  // Multi-select dùng key hiển thị (đã shuffle) — map về original khi submit
  const handleMultiSelect = (qid, key) => {
    setAnswers(prev => {
      const cur = (prev[qid] || '').split(',').filter(Boolean);
      const idx = cur.indexOf(key);
      if (idx >= 0) cur.splice(idx, 1); else cur.push(key);
      return { ...prev, [qid]: cur.sort().join(',') };
    });
  };

  const confirmSubmit = () => {
    isSubmittingRef.current = true;
    if (!confirm('Bạn có chắc muốn nộp bài? Không thể chỉnh sửa sau khi nộp.')) {
      isSubmittingRef.current = false; return;
    }
    handleSubmit();
  };

  if (submitted) return (
    <div className="ct-done-page">
      <div className="ct-done-card">
        <div className="ct-done-icon">✓</div>
        <h2>Nộp bài thành công!</h2>
        <p>Bài làm của bạn đang được Trợ lý ảo Viet Huong Ceramics chấm điểm.</p>
        {violations > 0 && <div className="ct-done-violations">Số lần rời trang: <strong>{violations}</strong></div>}
        <button className="ct-start-btn" onClick={() => navigate('/candidate/tests')}>Về trang chủ</button>
      </div>
    </div>
  );

  if (loading) return <div className="ct-loading ct-loading--page">Đang tải bài test...</div>;
  if (error) return (
    <div className="ct-error-page">
      <div className="ct-error-card">
        <div className="ct-error-icon">⚠</div>
        <p>{error}</p>
        <button className="ct-start-btn" onClick={() => navigate('/candidate/tests')}>Quay lại</button>
      </div>
    </div>
  );

  return (
    <div className="ct-page">
      {showWarning && (
        <WarningOverlay
          msg={warningMsg}
          violations={violations}
          forceSubmit={forceSubmit}
          onClose={() => { if (!forceSubmit) setShowWarning(false); }}
        />
      )}

      <header className="ct-header">
        <div className="ct-header__info">
          <h1 className="ct-header__title">{test.title}</h1>
          <span className="ct-header__meta">{test.questions?.length} câu · {test.time_limit} phút</span>
        </div>
        <div className="ct-header__right">
          {violations > 0 && (
            <div className="ct-violation-badge">⚠️ {violations}/{MAX_VIOLATIONS} vi phạm</div>
          )}
          {test.remaining_seconds != null && (
            <Timer seconds={test.remaining_seconds} onExpire={handleSubmit} />
          )}
        </div>
      </header>

      <div className="ct-questions">
        {test.questions?.map((q, i) => (
          <div key={q.id} className="ct-question">
            <div className="ct-question__head">
              <span className="ct-q-num">Câu {i + 1}</span>
              <span className="ct-q-points">{q.points} điểm</span>
            </div>
            <p className="ct-question__content">{q.content}</p>

            {q.question_type === 'multiple_choice' && q.options && (
              <div className="ct-options">
                {q.options.map(opt => (
                  <label key={opt.key} className={`ct-option ${answers[q.id] === opt.key ? 'selected' : ''}`}>
                    <input type="radio" name={`q_${q.id}`} value={opt.key}
                      checked={answers[q.id] === opt.key}
                      onChange={() => setAnswer(q.id, opt.key)} />
                    <span className="ct-option__key">{opt.key}</span>
                    <span className="ct-option__text">{opt.text}</span>
                  </label>
                ))}
              </div>
            )}

            {q.question_type === 'multi_select' && q.options && (
              <div className="ct-options">
                {q.options.map(opt => {
                  const sel = (answers[q.id] || '').split(',').includes(opt.key);
                  return (
                    <label key={opt.key} className={`ct-option ${sel ? 'selected' : ''}`}>
                      <input type="checkbox" checked={sel}
                        onChange={() => handleMultiSelect(q.id, opt.key)} />
                      <span className="ct-option__key">{opt.key}</span>
                      <span className="ct-option__text">{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {['short_answer', 'reading'].includes(q.question_type) && (
              <textarea className="ct-textarea" rows={4} placeholder="Nhập câu trả lời..."
                value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)} />
            )}

            {q.question_type === 'speaking' && (
              <SpeakingQuestion question={q} assignmentId={assignment_id}
                onRecorded={(qid, url) => setAnswer(qid, url)}
                isRequestingMic={isRequestingMic} />
            )}

            {q.question_type === 'typing_sample' && (
              <TypingTest
                question={q}
                assignmentId={assignment_id}
                timeLimit={60}
                onDone={result => setAnswer(q.id, JSON.stringify(result))}
              />
            )}
          </div>
        ))}
      </div>

      <div className="ct-footer">
        <span className="ct-footer__progress">
          Đã trả lời: {Object.keys(answers).length}/{test.questions?.length} câu
        </span>
        <button className="ct-submit-btn" onClick={confirmSubmit} disabled={submitting}>
          {submitting ? 'Đang nộp bài...' : 'Nộp bài'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Trang kết quả
// ============================================================
export function CandidateResultPage() {
  const { assignment_id } = useParams();
  const navigate = useNavigate();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/candidate/assignments/${assignment_id}/result`, { headers: headers() })
      .then(r => r.json()).then(d => { setResult(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [assignment_id]);

  if (loading) return <div className="ct-loading ct-loading--page">Đang tải kết quả...</div>;
  if (!result)  return null;

  if (result.status === 'submitted') return (
    <div className="ct-done-page">
      <div className="ct-done-card">
        <div style={{ fontSize: 40 }}>⏳</div>
        <h2>Đang chờ chấm điểm</h2>
        <p>Vui lòng quay lại sau.</p>
        <button className="ct-start-btn" onClick={() => navigate('/candidate/tests')}>Quay lại</button>
      </div>
    </div>
  );

  return (
    <div className="ct-result-page">
      <div className="ct-result-header">
        <button className="ct-back-btn" onClick={() => navigate('/candidate/tests')}>← Quay lại</button>
        <h1>{result.title}</h1>
      </div>
      <div className="ct-result-summary">
        <div className={`ct-result-big ${result.passed ? 'pass' : 'fail'}`}>{result.percentage}%</div>
        <div className="ct-result-detail">
          <span>{result.total_score}/{result.max_score} điểm</span>
          <span className={`ct-pass-badge ${result.passed ? 'pass' : 'fail'}`}>
            {result.passed ? '✓ Đạt yêu cầu' : 'Chưa đạt'}
          </span>
        </div>
        {result.violations > 0 && (
          <div className="ct-result-violations">
            ⚠️ Ứng viên rời trang <strong>{result.violations}</strong> lần trong quá trình thi
          </div>
        )}
        {result.ai_summary && (
          <div className="ct-ai-summary">
            <div className="ct-ai-summary__label">Nhận xét từ Trợ lý ảo Việt Hương Ceramics</div>
            <p>{result.ai_summary}</p>
          </div>
        )}
      </div>
      <div className="ct-answers-detail">
        {result.answers?.map((a, i) => (
          <div key={a.question_id}
            className={`ct-ans-item ${a.is_correct === 1 ? 'correct' : a.is_correct === 0 ? 'wrong' : ''}`}>
            <div className="ct-ans-item__head">
              <span>Câu {i + 1}</span>
              <span className="ct-ans-score">{a.score ?? '?'}/{a.max_points} điểm</span>
            </div>
            <p className="ct-ans-item__q">{a.content}</p>
            <div className="ct-ans-item__row">
              <span className="ct-label">Trả lời:</span>
              {(() => {
                try {
                  const r = JSON.parse(a.answer);
                  if (r.wpm !== undefined) return (
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                      <span style={{ background: '#fff8e6', border: '1px solid #f0b429', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>⌨️ {r.wpm} WPM</span>
                      <span style={{ background: '#f0fdf4', border: '1px solid #27ae60', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>✓ {r.accuracy}% chính xác</span>
                      <span style={{ background: '#f0f4ff', border: '1px solid #4a6cf7', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>📝 {r.typedText?.split(/\s+/).filter(Boolean).length} từ đã gõ</span>
                    </div>
                  );
                } catch { /* không phải JSON */ }
                return <span>{a.answer || '(Không trả lời)'}</span>;
              })()}
            </div>
            {a.correct_answer && (
              <div className="ct-ans-item__row correct-ans">
                <span className="ct-label">Đáp án đúng:</span>
                <span>{a.correct_answer}</span>
              </div>
            )}
            {a.ai_feedback && <div className="ct-ans-feedback">{a.ai_feedback}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}