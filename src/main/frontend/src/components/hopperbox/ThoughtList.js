import React from 'react';
import PropTypes from 'prop-types';
import './ThoughtList.css';

const ThoughtList = ({ thoughts, isLoading }) => {
  if (isLoading) {
    return (
      <div className="thought-list-container">
        <div className="thought-list-loading">
          <div className="spinner"></div>
          <p>생각들을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!thoughts || thoughts.length === 0) {
    return (
      <div className="thought-list-container">
        <div className="thought-list-empty">
          <span className="empty-icon">💭</span>
          <p>아직 저장된 생각이 없습니다</p>
          <p className="empty-hint">위에서 생각을 자유롭게 던져보세요!</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="thought-list-container">
      <div className="thought-list-header">
        <h2>저장된 생각들</h2>
        <span className="thought-count">{thoughts.length}개</span>
      </div>

      <div className="thought-list">
        {thoughts.map((thought) => (
          <div key={thought.id} className="thought-card">
            <div className="thought-content">{thought.content}</div>

            {thought.tags && thought.tags.length > 0 && (
              <div className="thought-tags">
                {thought.tags.map((tag, index) => (
                  <span key={index} className="thought-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="thought-footer">
              <span className="thought-date">
                {formatDate(thought.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

ThoughtList.propTypes = {
  thoughts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      content: PropTypes.string.isRequired,
      tags: PropTypes.arrayOf(PropTypes.string),
      createdAt: PropTypes.string.isRequired,
    })
  ),
  isLoading: PropTypes.bool,
};

ThoughtList.defaultProps = {
  thoughts: [],
  isLoading: false,
};

export default ThoughtList;