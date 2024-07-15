import React from 'react';

const EntryList = ({ entries }) => {
    return (
        <ul>
            {entries.map((entry, index) => (
                <li key={index}>{entry}</li>
            ))}
        </ul>
    );
};

export default EntryList;
