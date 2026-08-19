import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import '../../assets/css/EntryList.scss';

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true, // 12-hour format with AM/PM
    });
};

const EntryList = ({ entries, onDeleteEntry }) => {
    const [deletingIds, setDeletingIds] = useState(new Set());

    // 최신순으로 정렬
    const sortedEntries = entries.slice().sort((a, b) => new Date(b.createDate) - new Date(a.createDate));

    const handleDelete = async (entryId) => {
        if (deletingIds.has(entryId)) return; // 이미 삭제 중이면 무시
        
        if (!window.confirm('정말로 이 글을 삭제하시겠습니까?')) {
            return;
        }

        setDeletingIds(prev => new Set(prev).add(entryId));

        try {
            const response = await axios.delete(`/api/entry/${entryId}`);
            console.log('Delete response:', response.data);
            
            if (response.data.success) {
                onDeleteEntry(entryId); // 부모 컴포넌트에 삭제 알림
                alert('글이 삭제되었습니다.');
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
            
            let errorMessage = '삭제 중 오류가 발생했습니다.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.status === 403) {
                errorMessage = '삭제 권한이 없습니다. 본인이 작성한 글만 삭제할 수 있습니다.';
            }
            
            alert(errorMessage);
        } finally {
            setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(entryId);
                return newSet;
            });
        }
    };

    return (
        <ul className="post-list">
            {sortedEntries.map(entry => (
                <li key={entry.id} className="post-item">
                    <div className="post-header">
                        <span className="name">{entry.name}</span>
                        <button 
                            className="delete-button"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingIds.has(entry.id)}
                            title="내가 작성한 글만 삭제할 수 있습니다"
                        >
                            {deletingIds.has(entry.id) ? '삭제 중...' : '✕'}
                        </button>
                    </div>
                    <p className="createDate">{formatDate(entry.createDate)}</p>
                    <p className="content">{entry.content}</p>
                </li>
            ))}
        </ul>
    );
};

EntryList.propTypes = {
    entries: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            name: PropTypes.string.isRequired,
            content: PropTypes.string.isRequired,
            createDate: PropTypes.string.isRequired,
            color: PropTypes.string
        })
    ).isRequired,
    onDeleteEntry: PropTypes.func.isRequired
};

export default EntryList;
