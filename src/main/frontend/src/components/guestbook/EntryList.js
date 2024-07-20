import React from 'react';
import '../assets/css/EntryList.scss';

const EntryList = ({ entries }) => {
    return (
        <div className="entry-list-container">
            {entries.map(entry => (
                <div key={entry.id} className="entry-item">
                    <h3 className="entry-name">{entry.name}</h3>
                    <p className="entry-content">{entry.content}</p>
                </div>
            ))}
        </div>
    );
};

export default EntryList;
