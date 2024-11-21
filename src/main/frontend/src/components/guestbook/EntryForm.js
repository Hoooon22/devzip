import React, { useState } from 'react';
import axios from 'axios';
import '../../assets/css/EntryForm.scss';

const EntryForm = ({ addEntry }) => {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // 필요한 경우 Authorization 헤더를 추가
            const response = await axios.post('/api/v1/entries', 
                { name, content }, 
                {
                    withCredentials: true, // CORS 문제를 해결하기 위해 쿠키와 함께 인증 정보를 보낼 경우
                }
            );
            console.log('Entry added:', response.data);
            addEntry(response.data); // 새 항목을 Guestbook 컴포넌트의 상태에 추가
            setName('');
            setContent('');
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
