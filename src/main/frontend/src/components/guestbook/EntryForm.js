import React, { useState } from 'react';
import axios from 'axios';
import '../../assets/css/EntryForm.scss';

const EntryForm = ({ addEntry }) => {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const response = await axios.post('/api/v1/entries', { name, content });
            console.log('Entry added:', response.data);
            addEntry(response.data); // 새 항목을 Guestbook 컴포넌트의 상태에 추가
            setName('1');
            setContent('1');
        } catch (error) {
            console.error('Error adding entry:', error);
        }
    };

    return (
        <form className="entry-form" onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="entry-form-input"
            />
            <textarea
                placeholder="Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="entry-form-textarea"
            />
            <button type="submit" className="entry-form-button">Submit</button>
        </form>
    );
};

export default EntryForm;
