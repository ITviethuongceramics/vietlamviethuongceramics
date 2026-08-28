import { useState, useEffect, useRef, useCallback } from 'react';

export default function TypingTest({ question, assignmentId, timeLimit = 60, onDone }) {
  const sampleText   = question.content;
  const words        = sampleText.split(/\s+/);

  const [phase,      setPhase]      = useState('ready');
  const [typed,      setTyped]      = useState('');
  const [timeLeft,   setTimeLeft]   = useState(timeLimit);
  const [result,     setResult]     = useState(null);
  const [pasteWarn,  setPasteWarn]  = useState(false);

  const inputRef  = useRef(null);
  const timerRef  = useRef(null);
  const startedAt = useRef(null);

  const typedWords    = typed.trim() === '' ? [] : typed.trim().split(/\s+/);
  const currentWordIdx = typedWords.length - 1;

  const startTest = () => {
    setPhase('running');
    setTyped('');
    setTimeLeft(timeLimit);
    startedAt.current = Date.now();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (phase !== 'running') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          finishTest();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const finishTest = useCallback(() => {
    clearInterval(timerRef.current);
    setPhase('done');

    setTyped(prev => {
      const typedText = prev;
      const elapsed   = (Date.now() - startedAt.current) / 1000 / 60;
      const wTyped    = typedText.trim().split(/\s+/).filter(Boolean);
      const wpm       = Math.round(wTyped.length / elapsed);

      let correct = 0;
      const minLen = Math.min(sampleText.length, typedText.length);
      for (let i = 0; i < minLen; i++) {
        if (sampleText[i] === typedText[i]) correct++;
      }
      const accuracy = sampleText.length > 0
        ? Math.round((correct / sampleText.length) * 100) : 0;

      const wpmScore      = Math.min(wpm / 40, 1) * (question.points * 0.5);
      const accuracyScore = (accuracy / 100) * (question.points * 0.5);
      const score         = Math.round(wpmScore + accuracyScore);

      const r = { wpm, accuracy, score, maxPoints: question.points, typedText };
      setResult(r);
      onDone?.(r);
      return typedText;
    });
  }, [sampleText, question.points, onDone]);

  // ── Chặn paste / copy / cut ───────────────────────────────
  const blockClipboard = useCallback((e) => {
    e.preventDefault();
    setPasteWarn(true);
    setTimeout(() => setPasteWarn(false), 2000);
  }, []);

  // Chặn chuột phải trên textarea
  const blockContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleInput = (e) => {
    if (phase !== 'running') return;
    setTyped(e.target.value);
  };

  const renderWords = () => {
    return words.map((word, wi) => {
      const typedWord = typedWords[wi] || '';
      let cls = 'tt-word';
      if (wi < currentWordIdx) {
        cls += typedWord === word ? ' tt-word--correct' : ' tt-word--wrong';
      } else if (wi === currentWordIdx) {
        cls += ' tt-word--current';
      }

      const chars = word.split('').map((ch, ci) => {
        const typedCh = typedWord[ci];
        let chCls = 'tt-char';
        if (typedCh === undefined) chCls += '';
        else if (typedCh === ch)   chCls += ' tt-char--correct';
        else                        chCls += ' tt-char--wrong';
        return <span key={ci} className={chCls}>{ch}</span>;
      });

      const showCursor = wi === currentWordIdx && phase === 'running';

      return (
        <span key={wi} className={cls}>
          {chars}
          {showCursor && <span className="tt-cursor" />}
          {' '}
        </span>
      );
    });
  };

  const pct = Math.round(((timeLimit - timeLeft) / timeLimit) * 100);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Sora:wght@300;400;600;700&display=swap');

        .tt-wrap {
          font-family: 'Sora', sans-serif;
          max-width: 820px;
          margin: 0 auto;
          padding: 0 16px;
        }

        /* ── READY ── */
        .tt-ready {
          text-align: center;
          padding: 48px 0;
        }
        .tt-ready__icon {
          font-size: 56px;
          margin-bottom: 16px;
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        .tt-ready__title {
          font-size: 26px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 8px;
        }
        .tt-ready__sub {
          font-size: 14px;
          color: #888;
          margin-bottom: 32px;
        }
        .tt-ready__preview {
          background: #f7f5f2;
          border: 1.5px dashed #ddd;
          border-radius: 12px;
          padding: 20px 24px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          color: #555;
          line-height: 1.8;
          text-align: left;
          margin-bottom: 28px;
          max-height: 120px;
          overflow: hidden;
          position: relative;
          user-select: none;
        }
        .tt-ready__preview::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 40px;
          background: linear-gradient(transparent, #f7f5f2);
        }
        .tt-start-btn {
          background: #1a1a1a;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 14px 40px;
          font-family: 'Sora', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .tt-start-btn:hover { background: #c87828; transform: translateY(-2px); }

        /* ── RUNNING ── */
        .tt-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }
        .tt-timer {
          font-family: 'JetBrains Mono', monospace;
          font-size: 32px;
          font-weight: 600;
          color: #1a1a1a;
          min-width: 60px;
        }
        .tt-timer--urgent { color: #e74c3c; animation: pulse .5s ease-in-out infinite alternate; }
        @keyframes pulse { to { opacity: .5; } }

        .tt-progress-bar {
          flex: 1;
          height: 6px;
          background: #eee;
          border-radius: 99px;
          overflow: hidden;
        }
        .tt-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #1a1a1a, #c87828);
          border-radius: 99px;
          transition: width .5s linear;
        }

        .tt-text-display {
          background: #fafaf8;
          border: 1.5px solid #e8e4de;
          border-radius: 14px;
          padding: 24px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 17px;
          line-height: 2;
          color: #bbb;
          margin-bottom: 16px;
          min-height: 120px;
          user-select: none;
          letter-spacing: .02em;
        }
        .tt-word { display: inline; }
        .tt-word--correct { color: #27ae60; }
        .tt-word--wrong   { color: #e74c3c; text-decoration: underline wavy #e74c3c; }
        .tt-word--current { color: #1a1a1a; }
        .tt-char--correct { color: #27ae60; }
        .tt-char--wrong   { color: #e74c3c; background: #fde8e8; border-radius: 2px; }
        .tt-cursor {
          display: inline-block;
          width: 2px;
          height: 1.1em;
          background: #c87828;
          margin-left: 1px;
          vertical-align: text-bottom;
          animation: blink .8s step-end infinite;
        }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }

        .tt-input {
          width: 100%;
          padding: 14px 18px;
          border: 2px solid #e0dbd3;
          border-radius: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 15px;
          color: #1a1a1a;
          background: #fff;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          resize: none;
        }
        .tt-input:focus {
          border-color: #c87828;
          box-shadow: 0 0 0 3px rgba(200,120,40,.1);
        }
        .tt-input-hint {
          font-size: 12px;
          color: #aaa;
          margin-top: 6px;
          text-align: right;
        }

        /* ── PASTE WARNING ── */
        .tt-paste-warn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff3cd;
          border: 1.5px solid #ffc107;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 13px;
          color: #856404;
          font-weight: 500;
          margin-bottom: 12px;
          animation: slideIn .2s ease;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── DONE ── */
        .tt-result {
          padding: 32px 0;
        }
        .tt-result__title {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 24px;
          text-align: center;
        }
        .tt-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .tt-stat {
          background: #f7f5f2;
          border-radius: 14px;
          padding: 20px;
          text-align: center;
          border: 1.5px solid #eee;
        }
        .tt-stat__val {
          font-family: 'JetBrains Mono', monospace;
          font-size: 36px;
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1;
        }
        .tt-stat__val--gold { color: #c87828; }
        .tt-stat__lbl {
          font-size: 12px;
          color: #888;
          margin-top: 6px;
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .tt-result__score {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          color: #fff;
          border-radius: 14px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .tt-result__score-label { font-size: 14px; color: rgba(255,255,255,.6); }
        .tt-result__score-val {
          font-family: 'JetBrains Mono', monospace;
          font-size: 28px;
          font-weight: 700;
          color: #f0b429;
        }
        .tt-result__feedback {
          margin-top: 14px;
          font-size: 13px;
          color: #666;
          text-align: center;
          line-height: 1.6;
        }

        @media (max-width: 600px) {
          .tt-stats { grid-template-columns: 1fr 1fr; }
          .tt-text-display { font-size: 14px; }
        }
      `}</style>

      <div className="tt-wrap">

        {/* ── READY ── */}
        {phase === 'ready' && (
          <div className="tt-ready">
            <div className="tt-ready__icon">⌨️</div>
            <div className="tt-ready__title">Bài test tốc độ đánh máy</div>
            <div className="tt-ready__sub">
              Bạn có <strong>{timeLimit} giây</strong> để gõ lại đoạn văn bên dưới càng chính xác càng tốt
            </div>
            <div
              className="tt-ready__preview"
              onCopy={blockClipboard}
              onContextMenu={blockContextMenu}
            >
              {sampleText}
            </div>
            <button className="tt-start-btn" onClick={startTest}>
              ▶ Bắt đầu ngay
            </button>
          </div>
        )}

        {/* ── RUNNING ── */}
        {phase === 'running' && (
          <>
            <div className="tt-header">
              <div className={`tt-timer ${timeLeft <= 10 ? 'tt-timer--urgent' : ''}`}>
                {String(Math.floor(timeLeft / 60)).padStart(2,'0')}:{String(timeLeft % 60).padStart(2,'0')}
              </div>
              <div className="tt-progress-bar">
                <div className="tt-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="tt-text-display">
              {renderWords()}
            </div>

            {pasteWarn && (
              <div className="tt-paste-warn">
                🚫 Không được phép sao chép / dán — hãy tự gõ nhé!
              </div>
            )}

            <textarea
              ref={inputRef}
              className="tt-input"
              rows={3}
              value={typed}
              onChange={handleInput}
              onPaste={blockClipboard}
              onCopy={blockClipboard}
              onCut={blockClipboard}
              onContextMenu={blockContextMenu}
              placeholder="Bắt đầu gõ tại đây..."
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
            <div className="tt-input-hint">
              {typedWords.length} / {words.length} từ
            </div>
          </>
        )}

        {/* ── DONE ── */}
        {phase === 'done' && result && (
          <div className="tt-result">
            <div className="tt-result__title">🎉 Kết quả bài đánh máy</div>
            <div className="tt-stats">
              <div className="tt-stat">
                <div className="tt-stat__val tt-stat__val--gold">{result.wpm}</div>
                <div className="tt-stat__lbl">WPM</div>
              </div>
              <div className="tt-stat">
                <div className="tt-stat__val">{result.accuracy}%</div>
                <div className="tt-stat__lbl">Độ chính xác</div>
              </div>
              <div className="tt-stat">
                <div className="tt-stat__val">{typedWords.length}</div>
                <div className="tt-stat__lbl">Từ đã gõ</div>
              </div>
            </div>
            <div className="tt-result__score">
              <div>
                <div className="tt-result__score-label">Điểm số</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:2}}>
                  WPM chuẩn 40 · Accuracy 50%
                </div>
              </div>
              <div className="tt-result__score-val">
                {result.score}/{result.maxPoints}
              </div>
            </div>
            <div className="tt-result__feedback">
              {result.wpm >= 50
                ? '🚀 Tốc độ xuất sắc! Bạn gõ rất nhanh.'
                : result.wpm >= 35
                  ? '✅ Tốc độ tốt, đạt yêu cầu công việc.'
                  : result.wpm >= 20
                    ? '📈 Tốc độ trung bình, cần luyện tập thêm.'
                    : '🐢 Tốc độ chậm, hãy luyện tập thêm nhé.'}
            </div>
          </div>
        )}
      </div>
    </>
  );
}