import React, { useState } from 'react';
import PropTypes from 'prop-types';
import TopicCreateModal from './TopicCreateModal';
import './TopicSelector.css';

const TopicSelector = ({ topics, selectedTopicId, onTopicSelect, onCreateTopic, onDeleteTopic }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = async (topicId, e) => {
    e.stopPropagation();

    if (!window.confirm('이 주제를 삭제하시겠습니까?\n(주제 안의 생각이 있으면 삭제할 수 없습니다)')) {
      return;
    }

    try {
      await onDeleteTopic(topicId);
    } catch (error) {
      console.error('주제 삭제 실패:', error);
      alert(error.response?.data?.message || '주제 삭제에 실패했습니다');
    }
  };

  return (
    <div className="topic-selector">
      {/* 전체 보기 옵션 */}
      <div
        className={`topic-item ${selectedTopicId === null ? 'active' : ''}`}
        onClick={() => onTopicSelect(null)}
        onKeyPress={(e) => e.key === 'Enter' && onTopicSelect(null)}
        role="button"
        tabIndex={0}
      >
        <span className="topic-emoji">🗺️</span>
        <span className="topic-name">전체 보기</span>
      </div>

      {/* 주제 목록 */}
      {topics.map(topic => (
        <div
          key={topic.id}
          className={`topic-item ${selectedTopicId === topic.id ? 'active' : ''}`}
          onClick={() => onTopicSelect(topic.id)}
          onKeyPress={(e) => e.key === 'Enter' && onTopicSelect(topic.id)}
          role="button"
          tabIndex={0}
          style={{ borderLeft: `4px solid ${topic.color || '#3498db'}` }}
        >
          <span className="topic-emoji">{topic.emoji || '💭'}</span>
          <span className="topic-name">{topic.name}</span>
          <button
            className="topic-delete-btn"
            onClick={(e) => handleDelete(topic.id, e)}
            title="주제 삭제"
            aria-label="주제 삭제"
          >
            ×
          </button>
        </div>
      ))}

      {/* 새 주제 만들기 버튼 */}
      <div
        className="topic-item topic-create-btn"
        onClick={() => setIsModalOpen(true)}
        onKeyPress={(e) => e.key === 'Enter' && setIsModalOpen(true)}
        role="button"
        tabIndex={0}
      >
        <span className="topic-emoji">➕</span>
        <span className="topic-name">새 주제 만들기</span>
      </div>

      {/* 주제 생성 모달 */}
      <TopicCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateTopic={onCreateTopic}
      />
    </div>
  );
};

TopicSelector.propTypes = {
  topics: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      emoji: PropTypes.string,
      color: PropTypes.string,
    })
  ).isRequired,
  selectedTopicId: PropTypes.number,
  onTopicSelect: PropTypes.func.isRequired,
  onCreateTopic: PropTypes.func.isRequired,
  onDeleteTopic: PropTypes.func.isRequired,
};

TopicSelector.defaultProps = {
  selectedTopicId: null,
};

export default TopicSelector;