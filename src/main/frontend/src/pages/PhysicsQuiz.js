import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PhysicsCanvas from '../components/PhysicsCanvas';
import { physicsQuestions } from '../data/physicsQuestions';
import '../assets/css/PhysicsQuiz.css';

// config 내 점 표기 경로에서 값 읽기/덮어쓰기 (예: "ball1.velocity")
const getByPath = (obj, path) =>
  path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const applyOverrides = (config, overrides) => {
  const next = JSON.parse(JSON.stringify(config));
  Object.entries(overrides).forEach(([path, value]) => {
    const parts = path.split('.');
    let cursor = next;
    for (let i = 0; i < parts.length - 1; i += 1) cursor = cursor[parts[i]];
    cursor[parts[parts.length - 1]] = value;
  });
  return next;
};

const PhysicsQuiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);
  const [answerHistory, setAnswerHistory] = useState([]);
  const [tuned, setTuned] = useState({}); // 슬라이더로 조정한 config 덮어쓰기 값
  const [replayKey, setReplayKey] = useState(0); // 캔버스 강제 리마운트용
  const timeoutRef = useRef(null);

  const question = physicsQuestions[currentQuestion];
  const tunables = question.simulation.tunable || [];

  const calculateScore = () => answerHistory.filter((a) => a.correct).length;

  // 조정값이 반영된 시뮬레이션 객체
  const liveSimulation = useMemo(() => ({
    type: question.simulation.type,
    config: applyOverrides(question.simulation.config, tuned)
  }), [question, tuned]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // 문제 전환 시 상태 초기화
  const resetForQuestion = (index) => {
    setCurrentQuestion(index);
    setSelectedAnswer('');
    setShowResult(false);
    setSimulationActive(false);
    setTuned({});
    setReplayKey((k) => k + 1);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleAnswerSelect = (optionId) => {
    if (showResult) return;
    setSelectedAnswer(optionId);
    setShowResult(true);

    const isCorrect = question.options.find((o) => o.id === optionId)?.correct || false;
    const newHistory = answerHistory.filter((h) => h.questionId !== question.id);
    setAnswerHistory([...newHistory, { questionId: question.id, selectedAnswer: optionId, correct: isCorrect }]);

    // 잠시 후 시뮬레이션 자동 재생
    timeoutRef.current = setTimeout(() => {
      setSimulationActive(true);
      setReplayKey((k) => k + 1);
    }, 1500);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < physicsQuestions.length - 1) resetForQuestion(currentQuestion + 1);
  };
  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) resetForQuestion(currentQuestion - 1);
  };
  const handleRestart = () => {
    setAnswerHistory([]);
    resetForQuestion(0);
  };
  const handleRetryCurrentQuestion = () => {
    setAnswerHistory(answerHistory.filter((h) => h.questionId !== question.id));
    setSelectedAnswer('');
    setShowResult(false);
    setSimulationActive(false);
    setTuned({});
    setReplayKey((k) => k + 1);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  // 슬라이더 조정 → 즉시 미리보기(정적), 재생 중이면 새 값으로 다시 실행
  const handleTune = (key, value) => {
    setTuned((prev) => ({ ...prev, [key]: value }));
    setReplayKey((k) => k + 1);
  };

  const handleReplay = () => {
    setSimulationActive(true);
    setReplayKey((k) => k + 1);
  };

  const getOptionClass = (option) => {
    if (!showResult) return selectedAnswer === option.id ? 'option selected' : 'option';
    if (option.correct) return 'option correct';
    if (selectedAnswer === option.id && !option.correct) return 'option incorrect';
    return 'option disabled';
  };

  const isLast = currentQuestion === physicsQuestions.length - 1;

  return (
    <div className="physics-quiz-container">
      <header className="quiz-header">
        <span className="quiz-tag">{'// physics quiz'}</span>
        <div className="quiz-header-row">
          <h1>🔬 물리학 퀴즈</h1>
          <Link to="/physics-lab" className="lab-link">물리 엔진 놀이터 →</Link>
        </div>
        <div className="progress-info">
          <span className="question-counter">문제 {currentQuestion + 1} / {physicsQuestions.length}</span>
          <span className="score">점수 {calculateScore()}</span>
        </div>
      </header>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((currentQuestion + 1) / physicsQuestions.length) * 100}%` }}
        />
      </div>

      <div className="quiz-content">
        {/* 문제 영역 */}
        <div className="question-section">
          <div className="question-card">
            <h2 className="question-title">{question.title}</h2>
            <p className="question-text">{question.question}</p>

            <div className="options-grid">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={getOptionClass(option)}
                  onClick={() => handleAnswerSelect(option.id)}
                  disabled={showResult}
                >
                  <span className="option-id">{option.id}</span>
                  <span className="option-text">{option.text}</span>
                  {showResult && option.correct && <span className="check-mark">✓</span>}
                  {showResult && selectedAnswer === option.id && !option.correct && (
                    <span className="x-mark">✗</span>
                  )}
                </button>
              ))}
            </div>

            {showResult && (
              <div className="explanation-card">
                <div className={`result-feedback ${
                  question.options.find((o) => o.id === selectedAnswer)?.correct ? 'correct' : 'incorrect'
                }`}>
                  {question.options.find((o) => o.id === selectedAnswer)?.correct
                    ? '🎉 정답입니다!'
                    : '❌ 아쉬워요. 해설을 확인해 보세요!'}
                </div>
                <h3>📚 해설</h3>
                <p>{question.explanation}</p>
              </div>
            )}
          </div>
        </div>

        {/* 시뮬레이션 영역 */}
        <div className="simulation-section">
          <div className="simulation-active">
            <h3>{simulationActive ? '🎬 물리 시뮬레이션' : '🔬 초기 상황'}</h3>
            <PhysicsCanvas
              key={`${question.id}-${replayKey}`}
              simulation={liveSimulation}
              isActive={simulationActive}
              onComplete={() => {}}
            />

            {!showResult && (
              <p className="simulation-hint">정답을 선택하면 실제 물리 현상이 시작됩니다!</p>
            )}

            {/* 정답 확인 후: 파라미터 조절 + 재생 */}
            {showResult && (
              <div className="sim-controls">
                {tunables.length > 0 && (
                  <div className="tune-panel">
                    <span className="tune-label">{'// 값을 바꿔 다시 실험해 보세요'}</span>
                    {tunables.map((t) => {
                      const value = getByPath(liveSimulation.config, t.key);
                      return (
                        <div className="tune-row" key={t.key}>
                          <div className="tune-row-head">
                            <span>{t.label}</span>
                            <span className="tune-value">
                              {typeof value === 'number' && !Number.isInteger(t.step)
                                ? value.toFixed(2)
                                : value}{t.unit}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={t.min}
                            max={t.max}
                            step={t.step}
                            value={value}
                            onChange={(e) => handleTune(t.key, parseFloat(e.target.value))}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
                <button type="button" className="replay-btn" onClick={handleReplay}>
                  ▶ 다시 재생
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="quiz-navigation">
        <button
          type="button"
          className="nav-button secondary"
          onClick={handlePreviousQuestion}
          disabled={currentQuestion === 0}
        >
          ← 이전
        </button>
        <button
          type="button"
          className="nav-button secondary"
          onClick={handleRetryCurrentQuestion}
          disabled={!showResult}
        >
          ↩ 다시 풀기
        </button>
        <button type="button" className="nav-button secondary" onClick={handleRestart}>
          ↻ 처음부터
        </button>
        <button
          type="button"
          className="nav-button primary"
          onClick={handleNextQuestion}
          disabled={!showResult || isLast}
        >
          {isLast ? '마지막 문제' : '다음 →'}
        </button>
      </div>

      {/* 결과 요약 */}
      {isLast && showResult && (
        <div className="quiz-summary">
          <h3>📊 퀴즈 결과</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">총 점수</span>
              <span className="stat-value">{calculateScore()}/{physicsQuestions.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">정답률</span>
              <span className="stat-value">
                {Math.round((calculateScore() / physicsQuestions.length) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicsQuiz;
