import React, { useState } from 'react';
import PhysicsCanvas from '../components/PhysicsCanvas';
import { physicsQuestions } from '../data/physicsQuestions';
import '../assets/css/PhysicsQuiz.css';

const PhysicsQuiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [showSimulation, setShowSimulation] = useState(true); // 처음부터 시뮬레이션 표시 (정적 상태)
  const [simulationActive, setSimulationActive] = useState(false); // 실제 물리 현상 실행 여부
  const [score, setScore] = useState(0);
  const [answerHistory, setAnswerHistory] = useState([]);

  const question = physicsQuestions[currentQuestion];

  // Debug logging
  console.log('PhysicsQuiz state:', { 
    currentQuestion, 
    showSimulation, 
    simulationActive, 
    questionType: question?.simulation?.type 
  });

  const handleAnswerSelect = (optionId) => {
    if (showResult) return; // 이미 답을 확인한 경우 무시
    
    setSelectedAnswer(optionId);
    setShowResult(true);
    
    const isCorrect = question.options.find(opt => opt.id === optionId)?.correct || false;
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setAnswerHistory([...answerHistory, {
      questionId: question.id,
      selectedAnswer: optionId,
      correct: isCorrect
    }]);

    // 2초 후 시뮬레이션 활성화 (실제 물리 현상 시작)
    setTimeout(() => {
      setSimulationActive(true);
    }, 2000);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < physicsQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
      setShowResult(false);
      setShowSimulation(true); // 정적 상태로 시뮬레이션 표시
      setSimulationActive(false); // 물리 현상은 비활성화
    } else {
      // 퀴즈 완료
      alert(`퀴즈 완료! 총 점수: ${score + (question.options.find(opt => opt.id === selectedAnswer)?.correct ? 1 : 0)}/${physicsQuestions.length}`);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer('');
      setShowResult(false);
      setShowSimulation(true); // 정적 상태로 시뮬레이션 표시
      setSimulationActive(false); // 물리 현상은 비활성화
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer('');
    setShowResult(false);
    setShowSimulation(true); // 정적 상태로 시뮬레이션 표시
    setSimulationActive(false); // 물리 현상은 비활성화
    setScore(0);
    setAnswerHistory([]);
  };

  const getOptionClass = (option) => {
    if (!showResult) {
      return selectedAnswer === option.id ? 'option selected' : 'option';
    }
    
    if (option.correct) {
      return 'option correct';
    } else if (selectedAnswer === option.id && !option.correct) {
      return 'option incorrect';
    }
    
    return 'option disabled';
  };

  return (
    <div className="physics-quiz-container">
      {/* 헤더 */}
      <header className="quiz-header">
        <h1>🧪 물리학 퀴즈</h1>
        <div className="progress-info">
          <span className="question-counter">
            문제 {currentQuestion + 1} / {physicsQuestions.length}
          </span>
          <span className="score">점수: {score}</span>
        </div>
      </header>

      {/* 프로그레스 바 */}
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${((currentQuestion + 1) / physicsQuestions.length) * 100}%` }}
        />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="quiz-content">
        {/* 문제 영역 */}
        <div className="question-section">
          <div className="question-card">
            <h2 className="question-title">{question.title}</h2>
            <p className="question-text">{question.question}</p>
            
            {/* 객관식 선택지 */}
            <div className="options-grid">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  className={getOptionClass(option)}
                  onClick={() => handleAnswerSelect(option.id)}
                  disabled={showResult}
                >
                  <span className="option-id">{option.id}</span>
                  <span className="option-text">{option.text}</span>
                  {showResult && option.correct && (
                    <span className="check-mark">✓</span>
                  )}
                  {showResult && selectedAnswer === option.id && !option.correct && (
                    <span className="x-mark">✗</span>
                  )}
                </button>
              ))}
            </div>

            {/* 정답 설명 */}
            {showResult && (
              <div className="explanation-card">
                <h3>📚 해설</h3>
                <p>{question.explanation}</p>
                {selectedAnswer && (
                  <div className={`result-feedback ${
                    question.options.find(opt => opt.id === selectedAnswer)?.correct ? 'correct' : 'incorrect'
                  }`}>
                    {question.options.find(opt => opt.id === selectedAnswer)?.correct 
                      ? '🎉 정답입니다!' 
                      : '❌ 틀렸습니다. 다시 생각해보세요!'
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 시뮬레이션 영역 */}
        <div className="simulation-section">
          {!showSimulation ? (
            <div className="simulation-placeholder">
              <div className="placeholder-content">
                <div className="physics-icon">⚗️</div>
                <h3>물리 시뮬레이션</h3>
                <p>정답을 선택하면<br/>실제 물리 현상을 확인할 수 있어요!</p>
              </div>
            </div>
          ) : (
            <div className="simulation-active">
              <h3>
                {simulationActive ? '🎬 물리 현상 시뮬레이션' : '🔬 초기 상황'}
              </h3>
              <PhysicsCanvas 
                simulation={question.simulation}
                isActive={simulationActive} // simulationActive로 변경
                onComplete={() => {}}
              />
              {!simulationActive && (
                <p className="simulation-hint">
                  정답을 선택하면 실제 물리 현상이 시작됩니다!
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="quiz-navigation">
        <button 
          className="nav-button secondary"
          onClick={handlePreviousQuestion}
          disabled={currentQuestion === 0}
        >
          ← 이전 문제
        </button>

        <button 
          className="nav-button secondary"
          onClick={handleRestart}
        >
          🔄 처음부터
        </button>

        <button 
          className="nav-button primary"
          onClick={handleNextQuestion}
          disabled={!showResult}
        >
          {currentQuestion === physicsQuestions.length - 1 ? '완료' : '다음 문제 →'}
        </button>
      </div>

      {/* 퀴즈 완료 시 결과 요약 */}
      {currentQuestion === physicsQuestions.length - 1 && showResult && (
        <div className="quiz-summary">
          <h3>📊 퀴즈 결과</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">총 점수</span>
              <span className="stat-value">
                {score + (question.options.find(opt => opt.id === selectedAnswer)?.correct ? 1 : 0)}/{physicsQuestions.length}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">정답률</span>
              <span className="stat-value">
                {Math.round(((score + (question.options.find(opt => opt.id === selectedAnswer)?.correct ? 1 : 0)) / physicsQuestions.length) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicsQuiz;