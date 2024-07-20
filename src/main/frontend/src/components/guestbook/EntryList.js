import React from 'react';

const getColorFromName = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00FFFFFF)
        .toString(16)
        .toUpperCase()
        .padStart(6, '0');
    return `#${color}`;
};

const EntryList = ({ entries }) => {
    return (
        <div className="EntryList">
            {entries.map((entry) => (
                <div key={entry.id} className="Entry">
                    <div className="EntryName" style={{ color: getColorFromName(entry.name) }}>
                        {entry.name}
                    </div>
                    <div className="EntryContent">{entry.content}</div>
                </div>
            ))}
        </div>
    );
};

export default EntryList;
