// EntryList.js
import React from 'react';

const EntryList = ({ entries }) => {
    return (
        <ul>
            {entries.map((entry) => (
                <li key={entry.id}>
                    {entry.ip}: {entry.content}
                </li>
            ))}
        </ul>
    );
};

export default EntryList;
