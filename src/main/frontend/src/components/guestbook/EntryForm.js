import React, { useState } from 'react';
import axios from 'axios';
import '../../assets/css/EntryForm.scss';

// Axios 기본 설정
axios.defaults.withXSRFToken = true; // 새로운 옵션 설정

const EntryForm = ({ addEntry }) => {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState(null); // 에러 메시지 상태 추가

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!name || !content) {
            setError('Name and Content are required!');
            return;
        }

        try {
            const response = await axios.post(
                '/api/v1/entries',
                { name, content }, // 요청 본문에 데이터를 포함
                {
                    headers: {
                        'X-CSRFToken': getCSRFToken(), // CSRF 토큰 헤더 추가
                    },
                }
            );
            console.log('Entry added:', response.data);
            addEntry(response.data); // Guestbook 상태에 추가
            setName('');
            setContent('');
            setError(null); // 에러 초기화
        } catch (error) {
            console.error('Error adding entry:', error);
            setError('Failed to add entry. Please try again.'); // 에러 메시지 설정
        }
    };

    // CSRF 토큰을 가져오는 함수
    const getCSRFToken = () => {
        const csrfCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='));
        return csrfCookie ? csrfCookie.split('=')[1] : null;
    };

    return (
        <form className="entry-form" onSubmit={handleSubmit}>
            {error && <p className="error-message">{error}</p>} {/* 에러 메시지 표시 */}
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
