import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './ThoughtInput.css';

const ThoughtInput = ({ onThoughtSubmit }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onThoughtSubmit(content);
      setContent(''); // 입력 필드 초기화
    } catch (error) {
      console.error('Failed to submit thought:', error);
      alert('생각 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    // Ctrl/Cmd + Enter로 제출
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  return (
    <div className="thought-input-container">
      <form onSubmit={handleSubmit} className="thought-input-form">
        <textarea
          className="thought-input-textarea"
          placeholder="생각을 자유롭게 적어보세요... (Ctrl/Cmd + Enter로 저장)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isSubmitting}
          rows={4}
        />
        <div className="thought-input-footer">
          <span className="thought-input-hint">
            💡 AI가 자동으로 태그를 추출하고 연관 관계를 분석합니다
          </span>
          <button
            type="submit"
            className="thought-input-submit"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? '저장 중...' : '상자에 던지기 🎯'}
          </button>
        </div>
      </form>
    </div>
  );
};

ThoughtInput.propTypes = {
  onThoughtSubmit: PropTypes.func.isRequired,
};

export default ThoughtInput;