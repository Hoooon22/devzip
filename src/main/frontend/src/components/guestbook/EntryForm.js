// EntryForm.js
import React, { useState } from 'react';
import axios from 'axios';

const EntryForm = ({ addEntry }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const response = await axios.post('/api/v1/entries', { title, content });
            addEntry(response.data);
            setTitle('');
            setContent('');
            console.log('Entry added:', response.data);
        } catch (error) {
            console.error('Error adding entry:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
                placeholder="Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
            />
            <button type="submit">Add Entry</button>
        </form>
    );
};

export default EntryForm;
