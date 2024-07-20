import React from 'react';

const EntryList = ({ entries }) => {
    return (
        <ul className="post-list">
            {entries.map(entry => (
                <li key={entry.id} className="post-item">
                    <span className="name" style={{ color: entry.color }}>{entry.title}</span>
                    <p className="content">{entry.content}</p>
                </li>
            ))}
        </ul>
    );
};

export default EntryList;
