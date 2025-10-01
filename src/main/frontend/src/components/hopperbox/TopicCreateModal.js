import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './TopicCreateModal.css';

const TopicCreateModal = ({ isOpen, onClose, onCreateTopic }) => {
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💡');
  const [selectedColor, setSelectedColor] = useState('#3498db');

  const emojiOptions = ['💡', '🎯', '📚', '💼', '🎨', '🔧', '🌟', '🚀', '💭', '✨'];
  const colorOptions = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    try {
      await onCreateTopic(newTopicName, newTopicDescription, selectedColor, selectedEmoji);
      // 폼 초기화
      setNewTopicName('');
      setNewTopicDescription('');
      setSelectedEmoji('💡');
      setSelectedColor('#3498db');
      onClose();
    } catch (error) {
      console.error('Failed to create topic:', error);
      alert('주제 생성에 실패했습니다.');
    }
  };

  const handleEmojiSelect = (emoji) => {
    setSelectedEmoji(emoji);
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  const handleKeyPress = (e, handler) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>새 주제 만들기</h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="topic-create-form">
          <div className="form-group">
            <label htmlFor="topic-name">주제 이름 *</label>
            <input
              id="topic-name"
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="예: 업무 아이디어"
              maxLength={100}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="topic-description">설명 (선택)</label>
            <textarea
              id="topic-description"
              value={newTopicDescription}
              onChange={(e) => setNewTopicDescription(e.target.value)}
              placeholder="이 주제에 대한 간단한 설명을 입력하세요"
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>이모지 선택</label>
            <div className="emoji-selector">
              {emojiOptions.map((emoji) => (
                <div
                  key={emoji}
                  className={`emoji-option ${selectedEmoji === emoji ? 'selected' : ''}`}
                  onClick={() => handleEmojiSelect(emoji)}
                  onKeyPress={(e) => handleKeyPress(e, () => handleEmojiSelect(emoji))}
                  role="button"
                  tabIndex={0}
                  aria-label={`이모지 ${emoji} 선택`}
                >
                  {emoji}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>색상 선택</label>
            <div className="color-selector">
              {colorOptions.map((color) => (
                <div
                  key={color}
                  className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  onKeyPress={(e) => handleKeyPress(e, () => handleColorSelect(color))}
                  role="button"
                  tabIndex={0}
                  aria-label={`색상 ${color} 선택`}
                />
              ))}
            </div>
          </div>

          <div className="form-preview">
            <label>미리보기</label>
            <div
              className="topic-preview"
              style={{
                backgroundColor: selectedColor,
                color: 'white'
              }}
            >
              <span className="preview-emoji">{selectedEmoji}</span>
              <span className="preview-name">{newTopicName || '주제 이름'}</span>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn-create"
              disabled={!newTopicName.trim()}
            >
              생성하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

TopicCreateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreateTopic: PropTypes.func.isRequired,
};

export default TopicCreateModal;
