import React, { useState } from 'react';
import './TopicSelector.css';

const TopicSelector = ({ topics, selectedTopicId, onTopicSelect, onCreateTopic, onDeleteTopic }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicEmoji, setNewTopicEmoji] = useState('💡');
  const [newTopicColor, setNewTopicColor] = useState('#3498db');

  // 이모지 옵션
  const emojiOptions = ['💡', '🎯', '📚', '💼', '🎨', '🔧', '🌟', '🚀', '💭', '✨'];

  // 색상 옵션
  const colorOptions = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12',
    '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
  ];

  const handleCreateSubmit = async () => {
    if (!newTopicName.trim()) {
      alert('주제명을 입력해주세요');
      return;
    }

    try {
      await onCreateTopic(newTopicName, '', newTopicColor, newTopicEmoji);
      setIsCreating(false);
      setNewTopicName('');
      setNewTopicEmoji('💡');
      setNewTopicColor('#3498db');
    } catch (error) {
      console.error('주제 생성 실패:', error);
      alert('주제 생성에 실패했습니다');
    }
  };

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
          style={{ borderLeft: `4px solid ${topic.color || '#3498db'}` }}
        >
          <span className="topic-emoji">{topic.emoji || '💭'}</span>
          <span className="topic-name">{topic.name}</span>
          <button
            className="topic-delete-btn"
            onClick={(e) => handleDelete(topic.id, e)}
            title="주제 삭제"
          >
            ×
          </button>
        </div>
      ))}

      {/* 새 주제 만들기 */}
      {isCreating ? (
        <div className="topic-create-form">
          <div className="form-row">
            <select
              value={newTopicEmoji}
              onChange={(e) => setNewTopicEmoji(e.target.value)}
              className="emoji-select"
            >
              {emojiOptions.map(emoji => (
                <option key={emoji} value={emoji}>{emoji}</option>
              ))}
            </select>
            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="주제명"
              className="topic-name-input"
              autoFocus
              maxLength={100}
            />
          </div>
          <div className="form-row color-row">
            {colorOptions.map(color => (
              <div
                key={color}
                className={`color-option ${newTopicColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setNewTopicColor(color)}
              />
            ))}
          </div>
          <div className="form-actions">
            <button onClick={handleCreateSubmit} className="btn-create">생성</button>
            <button onClick={() => setIsCreating(false)} className="btn-cancel">취소</button>
          </div>
        </div>
      ) : (
        <div className="topic-item topic-create-btn" onClick={() => setIsCreating(true)}>
          <span className="topic-emoji">➕</span>
          <span className="topic-name">새 주제 만들기</span>
        </div>
      )}
    </div>
  );
};

export default TopicSelector;