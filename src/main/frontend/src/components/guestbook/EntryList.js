import React from 'react';

const EntryList = ({ entries }) => {
    return (
        <ul>
            {entries.map((entry, index) => (
                <li key={index}>
                    {entry.ip}: {entry.content}
                </li>
            ))}
        </ul>
    );
};

export default EntryList;
