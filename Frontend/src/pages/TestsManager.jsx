import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './TestsManager.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api$/, '');

const getToken = () => localStorage.getItem('admin_token');
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`
});

const StatusBadge = ({ status }) => {
  const map = {
    pending: { label: 'Chờ làm', cls: 'badge--pending' },
    in_progress: { label: 'Đang làm', cls: 'badge--progress' },
    submitted: { label: 'Đã nộp', cls: 'badge--submitted' },
    graded: { label: 'Đã chấm', cls: 'badge--graded' },
    expired: { label: 'Hết hạn', cls: 'badge--expired' },
  };
  const s = map[status] || { label: status, cls: '' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
};

const typeLabel = t => ({
  excel_word: 'Excel / Word',
  typing: 'Đánh máy',
  english: 'Tiếng Anh',
  chinese: 'Tiếng Trung',
  custom: 'Tùy chỉnh',
}[t] || t);

export default function TestsManager() {
  const [tab, setTab] = useState('tests');
  const [tests, setTests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [lockDetail, setLockDetail] = useState(null);

  const [showCreateTest, setShowCreateTest] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [detailTest, setDetailTest] = useState(null);
  const [detailResult, setDetailResult] = useState(null);

  const [filterStatus, setFilterStatus] = useState('');
  const [searchApp, setSearchApp] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/tests`, { headers: headers() });
      const d = await r.json();
      setTests(Array.isArray(d) ? d : []);
    } catch { showToast('Lỗi tải bộ đề', 'error'); }
    finally { setLoading(false); }
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/api/tests/assignments/list`;
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (params.toString()) url += '?' + params;
      const r = await fetch(url, { headers: headers() });
      const d = await r.json();
      setAssignments(Array.isArray(d) ? d : []);
    } catch { showToast('Lỗi tải danh sách', 'error'); }
    finally { setLoading(false); }
  }, [filterStatus]);

  const fetchApplications = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/applications`, { headers: headers() });
      const d = await r.json();
      setApplications(Array.isArray(d) ? d : []);
    } catch { }
  }, []);

  useEffect(() => { fetchTests(); fetchApplications(); }, [fetchTests, fetchApplications]);
  useEffect(() => { if (tab === 'assignments') fetchAssignments(); }, [tab, fetchAssignments]);

  const handleDeleteTest = async (id) => {
    if (!confirm('Xóa bộ đề này?')) return;
    const r = await fetch(`${API}/api/tests/${id}`, { method: 'DELETE', headers: headers() });
    const d = await r.json();
    if (r.ok) { showToast(d.message); fetchTests(); }
    else showToast(d.message, 'error');
  };

  const handleToggleActive = async (test) => {
    const r = await fetch(`${API}/api/tests/${test.id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ is_active: test.is_active ? 0 : 1 })
    });
    if (r.ok) { showToast('Cập nhật thành công'); fetchTests(); }
  };

  const handleGrade = async (assignmentId) => {
    showToast('Trợ lý ảo Viet Huong Ceramics đang chấm điểm...', 'info');
    const r = await fetch(`${API}/api/grading/assignments/${assignmentId}/grade`, { method: 'POST', headers: headers() });
    const d = await r.json();
    if (r.ok) { showToast('Chấm xong! Email đã gửi HR.'); fetchAssignments(); }
    else showToast(d.message, 'error');
  };

  const handleViewResult = async (assignmentId) => {
    const r = await fetch(`${API}/api/tests/assignments/${assignmentId}/answers`, { headers: headers() });
    const d = await r.json();
    if (r.ok) setDetailResult(d);
    else showToast(d.message, 'error');
  };

  const handleViewLock = async (assignmentId) => {
    const r = await fetch(`${API}/api/tests/assignments/${assignmentId}/lock-status`, { headers: headers() });
    const d = await r.json();
    if (r.ok) setLockDetail(d);
    else showToast(d.message, 'error');
  };

  const handleReset = async (assignmentId, name) => {
    if (!confirm(`Reset bài của "${name}"?\nToàn bộ câu trả lời sẽ bị xóa, ứng viên làm lại từ đầu.`)) return;
    const r = await fetch(`${API}/api/tests/assignments/${assignmentId}/reset`, { method: 'POST', headers: headers() });
    const d = await r.json();
    if (r.ok) { showToast(d.message); fetchAssignments(); }
    else showToast(d.message, 'error');
  };

  const handleForceDelete = async (assignmentId, name) => {
    if (!confirm(`XÓA HOÀN TOÀN bài của "${name}"?\nKhông thể khôi phục!`)) return;
    const r = await fetch(`${API}/api/tests/assignments/${assignmentId}/force`, { method: 'DELETE', headers: headers() });
    const d = await r.json();
    if (r.ok) { showToast(d.message); fetchAssignments(); }
    else showToast(d.message, 'error');
  };

  const filteredAssignments = assignments.filter(a =>
    !searchApp ||
    a.full_name?.toLowerCase().includes(searchApp.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchApp.toLowerCase())
  );

  return (
    <div className="tests-manager">
      {toast && <div className={`tm-toast tm-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="tm-header">
        {tab === 'tests' && (
          <button className="tm-btn tm-btn--primary" onClick={() => setShowCreateTest(true)}>
            + Tạo bộ đề mới
          </button>
        )}
      </div>

      <div className="tm-tabs">
        <button className={`tm-tab ${tab === 'tests' ? 'active' : ''}`} onClick={() => setTab('tests')}>
          Bộ đề ({tests.length})
        </button>
        <button className={`tm-tab ${tab === 'assignments' ? 'active' : ''}`} onClick={() => setTab('assignments')}>
          Phân công & Kết quả
        </button>
      </div>

      {tab === 'tests' && (
        <div className="tm-section">
          {loading ? <div className="tm-loading">Đang tải...</div> : (
            <div className="tm-grid">
              {tests.length === 0 && <div className="tm-empty">Chưa có bộ đề nào. Tạo bộ đề đầu tiên!</div>}
              {tests.map(t => (
                <div key={t.id} className={`tm-card ${!t.is_active ? 'tm-card--inactive' : ''}`}>
                  <div className="tm-card__info">
                    <div className="tm-card__titlerow">
                      <h3 className="tm-card__title">{t.title}</h3>
                      <span className="tm-type-tag">{typeLabel(t.type)}</span>
                      <span className={`tm-active-dot ${t.is_active ? 'on' : 'off'}`} />
                    </div>
                    <div className="tm-card__meta">
                      <span className="tm-meta-chip">{t.time_limit} phút</span>
                      <span className="tm-meta-chip">{t.question_count || 0} câu hỏi</span>
                      <span className="tm-meta-chip">Đạt: {t.passing_score}%</span>
                      <span className="tm-meta-chip">Đã gửi: {t.assigned_count || 0}</span>
                    </div>
                  </div>
                  <div className="tm-card__actions">
                    <button className="tm-btn tm-btn--sm" onClick={() => { setSelectedTest(t); setShowAssign(true); }}>Gửi đề</button>
                    <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={() => setDetailTest(t)}>Xem đề</button>
                    <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={() => handleToggleActive(t)}>{t.is_active ? 'Tắt' : 'Bật'}</button>
                    <button className="tm-btn tm-btn--sm tm-btn--danger" onClick={() => handleDeleteTest(t.id)}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'assignments' && (
        <div className="tm-section">
          <div className="tm-toolbar">
            <input className="tm-search" placeholder="Tìm theo tên hoặc email..."
              value={searchApp} onChange={e => setSearchApp(e.target.value)} />
            <select className="tm-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ làm</option>
              <option value="in_progress">Đang làm</option>
              <option value="submitted">Đã nộp</option>
              <option value="graded">Đã chấm</option>
              <option value="expired">Hết hạn</option>
            </select>
            
          </div>

          {loading ? <div className="tm-loading">Đang tải...</div> : (
            <div className="tm-table-wrap">
              <table className="tm-table">
                <colgroup>
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '350px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: 'auto' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Ứng viên</th><th>Bài test</th><th>Trạng thái</th>
                    <th>Kết quả</th><th>Vi phạm</th><th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.length === 0 && (
                    <tr><td colSpan={7} className="tm-empty">Không có dữ liệu</td></tr>
                  )}
                  {filteredAssignments.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className="tm-candidate">
                          <span className="tm-candidate__name">{a.full_name}</span>
                          <span className="tm-candidate__email">{a.email}</span>
                        </div>
                      </td>
                      <td>
                        <div className="tm-candidate">
                          <span className="tm-candidate__name">{a.test_title}</span>
                          <span className="tm-candidate__email">{typeLabel(a.test_type)}</span>
                        </div>
                      </td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>
                        {a.percentage != null ? (
                          <div className="tm-score">
                            <span className={`tm-score__pct ${a.passed ? 'pass' : 'fail'}`}>{a.percentage}%</span>
                            <span className={`tm-score__label ${a.passed ? 'pass' : 'fail'}`}>{a.passed ? 'Đạt' : 'Không đạt'}</span>
                          </div>
                        ) : <span className="tm-na">—</span>}
                      </td>

                      <td>
                        {a.is_locked && a.violation_count > 0 ? (
                          <span style={{ color: '#A32D2D', fontWeight: 600, fontSize: 12 }}>🔒 {a.violation_count} lần</span>
                        ) : a.is_locked ? (
                          <span style={{ color: '#A32D2D', fontWeight: 600, fontSize: 12 }}>🔒 Bị khóa</span>
                        ) : a.violation_count > 0 ? (
                          <span style={{ color: '#854F0B', fontSize: 12 }}>⚠️ {a.violation_count} lần</span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className="tm-row-actions">
                         
                          {a.status === 'graded' && (
                            <button className="tm-btn tm-btn--sm" onClick={() => handleViewResult(a.id)}>Kết quả</button>
                          )}
                          {(a.is_locked || a.violation_count > 0) && (
                            <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={() => handleViewLock(a.id)}>🔒 Vi phạm</button>
                          )}
                          {['pending', 'in_progress', 'submitted', 'graded'].includes(a.status) && (
                            <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={() => handleReset(a.id, a.full_name)}>↺ Reset</button>
                          )}
                          <button className="tm-btn tm-btn--sm tm-btn--danger" onClick={() => handleForceDelete(a.id, a.full_name)}>Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tất cả modal dùng createPortal render vào document.body ── */}

      {showCreateTest && (
        <CreateTestModal
          onClose={() => setShowCreateTest(false)}
          onSuccess={() => { setShowCreateTest(false); fetchTests(); showToast('Tạo bộ đề thành công!'); }}
          apiBase={API} getHeaders={headers}
        />
      )}

      {showAssign && selectedTest && (
        <AssignModal
          test={selectedTest} applications={applications}
          onClose={() => { setShowAssign(false); setSelectedTest(null); }}
          onSuccess={() => { setShowAssign(false); setSelectedTest(null); showToast('Gửi đề thành công!'); fetchAssignments(); }}
          apiBase={API} getHeaders={headers}
        />
      )}

      {lockDetail && createPortal(
        <div className="tm-overlay" onClick={e => e.target === e.currentTarget && setLockDetail(null)}>
          <div className="tm-modal">
            <div className="tm-modal__head">
              <h2>Chi tiết vi phạm</h2>
              <button className="tm-modal__close" onClick={() => setLockDetail(null)}>✕</button>
            </div>
            <div className="tm-modal__body">
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Ứng viên', lockDetail.full_name],
                    ['Email', lockDetail.email],
                    ['Bài test', lockDetail.test_title],
                    ['Trạng thái', lockDetail.status],
                    ['Số vi phạm', `${lockDetail.violation_count || 0} lần`],
                    ['Bị khóa', lockDetail.is_locked ? '✅ Có' : '❌ Không'],
                    ['Lý do khóa', lockDetail.lock_reason || '—'],
                    ['Thời điểm khóa', lockDetail.locked_at ? new Date(lockDetail.locked_at).toLocaleString('vi-VN') : '—'],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 8px', color: '#6b7280', width: '40%' }}>{label}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 500 }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button className="tm-btn tm-btn--ghost"
                  onClick={() => { handleReset(lockDetail.id, lockDetail.full_name); setLockDetail(null); }}>
                  ↺ Reset bài
                </button>
                <button className="tm-btn tm-btn--danger"
                  onClick={() => { handleForceDelete(lockDetail.id, lockDetail.full_name); setLockDetail(null); }}>
                  Xóa hoàn toàn
                </button>
              </div>
            </div>
            <div className="tm-modal__foot">
              <button className="tm-btn tm-btn--ghost" onClick={() => setLockDetail(null)}>Đóng</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {detailTest && (
        <TestDetailModal test={detailTest} onClose={() => setDetailTest(null)} apiBase={API} getHeaders={headers} />
      )}

      {detailResult && (
        <ResultModal data={detailResult} onClose={() => setDetailResult(null)} />
      )}
    </div>
  );
}

function CreateTestModal({ onClose, onSuccess, apiBase, getHeaders }) {
  const [form, setForm] = useState({ title: '', type: 'excel_word', time_limit: 30, passing_score: 60 });
  const [questions, setQuestions] = useState([defaultQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function defaultQuestion() {
    return {
      question_type: 'multiple_choice', order: 1, content: '',
      options: [{ key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }, { key: 'D', text: '' }],
      correct_answer: 'A', points: 10, ai_graded: false, ai_rubric: '', speaking_prompt: ''
    };
  }

  const addQuestion = () => setQuestions(qs => [...qs, { ...defaultQuestion(), order: qs.length + 1 }]);
  const removeQuestion = (i) => setQuestions(qs => qs.filter((_, idx) => idx !== i));
  const updateQuestion = (i, field, value) => setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  const updateOption = (qi, oi, value) => setQuestions(qs => qs.map((q, idx) => {
    if (idx !== qi) return q;
    return { ...q, options: q.options.map((o, oidx) => oidx === oi ? { ...o, text: value } : o) };
  }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Vui lòng nhập tên bộ đề'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        questions: questions.map((q, i) => ({
          ...q, order: i + 1,
          options: ['multiple_choice', 'multi_select'].includes(q.question_type) ? q.options : null,
          correct_answer: ['multiple_choice', 'multi_select'].includes(q.question_type) ? q.correct_answer : null,
          ai_graded: q.ai_graded ? 1 : 0,
        }))
      };
      const r = await fetch(`${apiBase}/api/tests`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
      const d = await r.json();
      if (r.ok) onSuccess(); else setError(d.message);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div className="tm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tm-modal tm-modal--lg">
        <div className="tm-modal__head">
          <h2>Tạo bộ đề mới</h2>
          <button className="tm-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="tm-modal__body">
          {error && <div className="tm-alert tm-alert--error">{error}</div>}
          <div className="tm-form-row">
            <div className="tm-field tm-field--2">
              <label>Tên bộ đề *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="VD: Test Excel/Word cơ bản" />
            </div>
            <div className="tm-field">
              <label>Loại</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="excel_word">Excel / Word</option>
                <option value="typing">Đánh máy</option>
                <option value="english">Tiếng Anh</option>
                <option value="chinese">Tiếng Trung</option>
                <option value="custom">Tùy chỉnh</option>
              </select>
            </div>
          </div>
          <div className="tm-form-row">
            <div className="tm-field">
              <label>Thời gian (phút)</label>
              <input type="number" min={5} max={180} value={form.time_limit} onChange={e => setForm(f => ({ ...f, time_limit: +e.target.value }))} />
            </div>
            <div className="tm-field">
              <label>Điểm đạt (%)</label>
              <input type="number" min={0} max={100} value={form.passing_score} onChange={e => setForm(f => ({ ...f, passing_score: +e.target.value }))} />
            </div>
          </div>
          <div className="tm-questions-header">
            <h3>Câu hỏi ({questions.length})</h3>
            <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={addQuestion}>+ Thêm câu</button>
          </div>
          {questions.map((q, i) => (
            <div key={i} className="tm-question-block">
              <div className="tm-question-block__head">
                <span className="tm-q-num">Câu {i + 1}</span>
                <select value={q.question_type} onChange={e => updateQuestion(i, 'question_type', e.target.value)}>
                  <option value="multiple_choice">Trắc nghiệm</option>
                  <option value="multi_select">Nhiều đáp án</option>
                  <option value="short_answer">Tự luận (AI chấm)</option>
                  <option value="reading">Đọc hiểu (AI chấm)</option>
                  <option value="speaking">Bài nói (AI chấm)</option>
                  <option value="typing_sample">Đánh máy</option>
                </select>
                <input type="number" min={1} max={100} value={q.points}
                  onChange={e => updateQuestion(i, 'points', +e.target.value)} style={{ width: 70 }} />
                {questions.length > 1 && (
                  <button className="tm-btn tm-btn--sm tm-btn--danger" onClick={() => removeQuestion(i)}>Xóa</button>
                )}
              </div>
              <div className="tm-field" style={{ marginTop: 8 }}>
                <label>Nội dung câu hỏi *</label>
                <textarea rows={2} value={q.content} onChange={e => updateQuestion(i, 'content', e.target.value)} placeholder="Nhập nội dung câu hỏi..." />
              </div>
              {q.question_type === 'speaking' && (
                <div className="tm-field">
                  <label>Chủ đề / hướng dẫn</label>
                  <input value={q.speaking_prompt} onChange={e => updateQuestion(i, 'speaking_prompt', e.target.value)} placeholder="VD: Introduce yourself in English" />
                </div>
              )}
              {['multiple_choice', 'multi_select'].includes(q.question_type) && (
                <>
                  <div className="tm-options">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="tm-option">
                        <span className="tm-option__key">{opt.key}</span>
                        <input value={opt.text} onChange={e => updateOption(i, oi, e.target.value)} placeholder={`Đáp án ${opt.key}`} />
                      </div>
                    ))}
                  </div>
                  <div className="tm-field">
                    <label>Đáp án đúng</label>
                    <input value={q.correct_answer}
                      onChange={e => updateQuestion(i, 'correct_answer', e.target.value.toUpperCase())}
                      placeholder="A hoặc A,B" style={{ maxWidth: 160 }} />
                  </div>
                </>
              )}
              {['short_answer', 'reading', 'speaking'].includes(q.question_type) && (
                <div className="tm-field">
                  <label>Tiêu chí chấm AI (tùy chọn)</label>
                  <input value={q.ai_rubric} onChange={e => updateQuestion(i, 'ai_rubric', e.target.value)}
                    placeholder="VD: Chấm theo độ chính xác và ngữ pháp" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="tm-modal__foot">
          <button className="tm-btn tm-btn--ghost" onClick={onClose}>Hủy</button>
          <button className="tm-btn tm-btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Tạo bộ đề'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AssignModal({ test, applications, onClose, onSuccess, apiBase, getHeaders }) {
  const [selected, setSelected] = useState([]);
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const filtered = applications.filter(a =>
    a.status === 'interviewing' && (
      a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase())
    )
  );
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleAssign = async () => {
    if (!selected.length) { setError('Chọn ít nhất 1 ứng viên'); return; }
    setSaving(true); setError('');
    try {
      const r = await fetch(`${apiBase}/api/tests/assignments`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ application_ids: selected, test_id: test.id, deadline: deadline || null })
      });
      const d = await r.json();
      if (r.ok) onSuccess(); else setError(d.message);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div className="tm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tm-modal">
        <div className="tm-modal__head">
          <h2>Đề Bài: {test.title}</h2>
          <button className="tm-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="tm-modal__body">
          {error && <div className="tm-alert tm-alert--error">{error}</div>}
          <div className="tm-field">
            <label>Deadline (tùy chọn)</label>
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="tm-field">
            <label>Tìm ứng viên</label>
            <input placeholder="Tên hoặc email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="tm-candidate-list">
            {filtered.slice(0, 50).map(a => (
              <label key={a.id} className={`tm-candidate-item ${selected.includes(a.id) ? 'selected' : ''}`}>
                <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
                <div>
                  <span className="tm-candidate__name">{a.full_name}</span>
                  <span className="tm-candidate__email">{a.email} — {a.position}</span>
                </div>
              </label>
            ))}
            {filtered.length === 0 && <div className="tm-empty">Không tìm thấy ứng viên</div>}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>Đã chọn: {selected.length} ứng viên</div>
        </div>
        <div className="tm-modal__foot">
          <button className="tm-btn tm-btn--primary" onClick={handleAssign} disabled={saving}>
            {saving ? 'Đang gửi...' : `Gửi cho ${selected.length} ứng viên`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================
// Modal: Chi tiết bộ đề
// ============================================================
function TestDetailModal({ test, onClose, apiBase, getHeaders }) {
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    fetch(`${apiBase}/api/tests/${test.id}`, { headers: getHeaders() }).then(r => r.json()).then(setDetail);
  }, [test.id]);

  return createPortal(
    <div className="tm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tm-modal tm-modal--lg">
        <div className="tm-modal__head">
          <h2>{test.title}</h2>
          <button className="tm-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="tm-modal__body">
          {!detail ? <div className="tm-loading">Đang tải...</div> : (
            <>
              <div className="tm-detail-meta">
                <span>{typeLabel(detail.type)}</span>
                <span>{detail.time_limit} phút</span>
                <span>Đạt: {detail.passing_score}%</span>
                <span>{detail.questions?.length || 0} câu hỏi</span>
              </div>
              {detail.questions?.map((q, i) => (
                <div key={q.id} className="tm-question-view">
                  <div className="tm-question-view__head">
                    <span className="tm-q-num">Câu {i + 1}</span>
                    <span className="tm-type-tag">{q.question_type}</span>
                    <span className="tm-points">{q.points} điểm</span>
                  </div>
                  <p className="tm-question-view__content">{q.content}</p>
                  {q.options && (
                    <div className="tm-options-view">
                      {(typeof q.options === 'string' ? JSON.parse(q.options) : q.options).map(o => (
                        <div key={o.key} className={`tm-option-view ${q.correct_answer === o.key ? 'correct' : ''}`}>
                          <span>{o.key}.</span> {o.text}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.correct_answer && <div className="tm-correct-ans">Đáp án: <strong>{q.correct_answer}</strong></div>}
                </div>
              ))}
            </>
          )}
        </div>
        <div className="tm-modal__foot">
          <button className="tm-btn tm-btn--ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================
// Hàm xuất PDF dùng print window
// ============================================================
function exportResultToPDF(data) {
  const { assignment, answers, result } = data;
  const printedAt = new Date().toLocaleString('vi-VN');

  const statusColor = result?.passed ? '#16a34a' : '#dc2626';
  const statusText = result?.passed ? 'ĐẠT' : 'KHÔNG ĐẠT';

  const answersHTML = (answers || []).map((a, i) => {
    const bgColor = a.is_correct === 1 ? '#f0fdf4' : a.is_correct === 0 ? '#fef2f2' : '#fafafa';
    const borderColor = a.is_correct === 1 ? '#bbf7d0' : a.is_correct === 0 ? '#fecaca' : '#e5e7eb';
    const iconText = a.is_correct === 1 ? '✓' : a.is_correct === 0 ? '✗' : '?';
    const iconColor = a.is_correct === 1 ? '#16a34a' : a.is_correct === 0 ? '#dc2626' : '#9ca3af';

    return `
      <div style="
        background:${bgColor};
        border:1px solid ${borderColor};
        border-radius:8px;
        padding:14px 16px;
        margin-bottom:12px;
        page-break-inside:avoid;
      ">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="
            background:#1e40af;color:#fff;
            font-size:11px;font-weight:700;
            padding:2px 8px;border-radius:4px;
          ">Câu ${i + 1}</span>
          <span style="
            font-size:11px;color:#6b7280;
            background:#f3f4f6;padding:2px 8px;border-radius:4px;
          ">${a.question_type}</span>
          <span style="margin-left:auto;font-weight:600;font-size:13px;color:#374151;">
            ${a.score ?? '?'}/${a.max_points} điểm
          </span>
          <span style="font-size:16px;color:${iconColor};font-weight:700;">${iconText}</span>
        </div>
        <p style="margin:0 0 8px;font-size:13px;color:#111827;line-height:1.5;">${a.content || ''}</p>
        <div style="font-size:13px;color:#374151;margin-bottom:4px;">
          <span style="color:#6b7280;font-weight:500;">Trả lời: </span>
          ${a.answer || '<em style="color:#9ca3af">Không trả lời</em>'}
        </div>
        ${a.correct_answer ? `
          <div style="font-size:13px;color:#16a34a;margin-bottom:4px;">
            <span style="font-weight:500;">Đáp án đúng: </span>${a.correct_answer}
          </div>` : ''}
        ${a.ai_feedback ? `
          <div style="
            margin-top:8px;padding:8px 12px;
            background:#eff6ff;border-left:3px solid #3b82f6;
            border-radius:0 6px 6px 0;font-size:12px;color:#1e40af;
          ">
            <span style="font-weight:600;">AI nhận xét: </span>${a.ai_feedback}
          </div>` : ''}
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>Kết quả — ${assignment?.full_name || ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #111827;
      background: #fff;
      padding: 32px 40px;
      font-size: 14px;
      line-height: 1.6;
    }
    @media print {
      body { padding: 20px 28px; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm; size: A4; }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .company { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .print-btn {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      font-weight: 600;
    }
    .print-btn:hover { background: #1d4ed8; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    .info-row { display: flex; gap: 8px; font-size: 13px; }
    .info-label { color: #6b7280; min-width: 90px; flex-shrink: 0; }
    .info-value { font-weight: 500; color: #111827; }
    .score-box {
      display: flex;
      align-items: center;
      gap: 20px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 10px;
      padding: 16px 24px;
      margin-bottom: 20px;
    }
    .score-pct {
      font-size: 42px;
      font-weight: 800;
      line-height: 1;
    }
    .score-pct.pass { color: #16a34a; }
    .score-pct.fail { color: #dc2626; }
    .score-meta { display: flex; flex-direction: column; gap: 4px; }
    .score-detail { font-size: 15px; color: #374151; font-weight: 600; }
    .verdict {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
    }
    .ai-summary {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .ai-summary-label {
      font-size: 11px;
      font-weight: 700;
      color: #1e40af;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #dbeafe;
    }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 style="font-size:20px;font-weight:800;color:#1e40af;">KẾT QUẢ BÀI KIỂM TRA</h1>
      <div class="company">VIET HUONG CERAMICS — Hệ thống tuyển dụng</div>
    </div>
    <button class="print-btn no-print" onclick="window.print()">In / Lưu PDF</button>
  </div>

  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Ứng viên:</span>padding: 10px 14px
      <span class="info-value">${assignment?.full_name || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Email:</span>
      <span class="info-value">${assignment?.email || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Bài test:</span>
      <span class="info-value">${assignment?.test_title || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Loại:</span>
      <span class="info-value">${assignment?.test_type ? typeLabel(assignment.test_type) : '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Ngày xuất:</span>
      <span class="info-value">${printedAt}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Trạng thái:</span>
      <span class="info-value">Chấm điểm</span>
    </div>
  </div>

  ${result ? `
  <div class="score-box">
    <span class="score-pct ${result.passed ? 'pass' : 'fail'}">${result.percentage}%</span>
    <div class="score-meta">
      <span class="score-detail">${result.total_score} / ${result.max_score} điểm</span>
      <span class="verdict" style="background:${statusColor};">${statusText}</span>
    </div>
  </div>

  ${result.ai_summary ? `
  <div class="ai-summary">
    <div class="ai-summary-label">Nhận xét của Trợ lý ảo VIETHUONG CERAMICS</div>
    <p style="font-size:13px;color:#1e3a8a;line-height:1.6;">${result.ai_summary}</p>
  </div>` : ''}

  <div class="section-title">Chi tiết từng câu (${answers?.length || 0} câu)</div>
  ${answersHTML}
  ` : '<p style="color:#9ca3af;text-align:center;padding:32px 0;">Chưa có kết quả chấm điểm</p>'}

  <div class="footer">
    Tài liệu này được tạo tự động bởi hệ thống tuyển dụng Viet Huong Ceramics &nbsp;|&nbsp; ${printedAt}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Vui lòng cho phép popup để xuất PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
}

// ============================================================
// Modal: Kết quả (đã thêm nút Xuất PDF)
// ============================================================
function ResultModal({ data, onClose }) {
  const { assignment, answers, result } = data;

  return createPortal(
    <div className="tm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tm-modal tm-modal--lg">
        <div className="tm-modal__head">
          <h2>Kết quả — {assignment?.full_name}</h2>
          <button className="tm-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="tm-modal__body">
          {result ? (
            <>
              <div className="tm-result-summary">
                <div className="tm-result-score">
                  <span className={`tm-result-pct ${result.passed ? 'pass' : 'fail'}`}>{result.percentage}%</span>
                  <span className="tm-result-detail">{result.total_score}/{result.max_score} điểm</span>
                  <span className={`badge ${result.passed ? 'badge--graded' : 'badge--expired'}`}>
                    {result.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                  </span>
                </div>
                {result.ai_summary && (
                  <div className="tm-ai-summary">
                    <div className="tm-ai-summary__label">Nhận xét trợ lý ảo VIETHUONG CERAMICS</div>
                    <p>{result.ai_summary}</p>
                  </div>
                )}
              </div>
              <div className="tm-answers-list">
                {answers?.map((a, i) => (
                  <div key={a.question_id} className={`tm-answer-item ${a.is_correct === 1 ? 'correct' : a.is_correct === 0 ? 'wrong' : 'pending'}`}>
                    <div className="tm-answer-item__head">
                      <span className="tm-q-num">Câu {i + 1}</span>
                      <span className="tm-type-tag">{a.question_type}</span>
                      <span className="tm-points">{a.score ?? '?'}/{a.max_points} điểm</span>
                    </div>
                    <p className="tm-answer-item__q">{a.content}</p>
                    <div className="tm-answer-item__ans"><span className="tm-label">Trả lời:</span> {a.answer || <em>Không trả lời</em>}</div>
                    {a.correct_answer && <div className="tm-answer-item__correct"><span className="tm-label">Đáp án:</span> {a.correct_answer}</div>}
                    {a.ai_feedback && <div className="tm-answer-item__feedback"><span className="tm-label">AI nhận xét:</span> {a.ai_feedback}</div>}
                  </div>
                ))}
              </div>
            </>
          ) : <div className="tm-empty">Chưa có kết quả chấm điểm</div>}
        </div>
        <div className="tm-modal__foot">
          <button className="tm-btn tm-btn--ghost" onClick={onClose}>Đóng</button>
          {result && (
            <button
              className="tm-btn tm-btn--primary"
              onClick={() => exportResultToPDF(data)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              🖨️ Xuất PDF
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}