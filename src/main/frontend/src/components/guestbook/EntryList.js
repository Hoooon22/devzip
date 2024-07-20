import React from 'react';
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

const EntryList = ({ entries }) => {
    // 최신순으로 정렬
    const sortedEntries = entries.slice().sort((a, b) => new Date(b.createDate) - new Date(a.createDate));

    return (
        <ul className="post-list">
            {sortedEntries.map(entry => (
                <li key={entry.id} className="post-item">
                    <span className="name" style={{ color: entry.color }}>{entry.name}</span>
                    <p className="createDate">{formatDate(entry.createDate)}</p>
                    <p className="content">{entry.content}</p>
                </li>
            ))}
        </ul>
    );
};

export default EntryList;
