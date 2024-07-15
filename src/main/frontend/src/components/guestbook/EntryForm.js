import React, { useState } from 'react';

const EntryForm = ({ addEntry }) => {
    const [newEntry, setNewEntry] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newEntry.trim()) {
            addEntry(newEntry);
            setNewEntry('');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input 
                type="text" 
                value={newEntry} 
                onChange={(e) => setNewEntry(e.target.value)} 
                placeholder="Write a message..."
            />
            <button type="submit">Submit</button>
        </form>
    );
};

export default EntryForm;
