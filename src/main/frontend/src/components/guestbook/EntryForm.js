import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig'; // axiosConfig에서 설정된 axios 사용
import '../../assets/css/EntryForm.scss';

const EntryForm = ({ addEntry }) => {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState(null); // 에러 메시지 상태 추가
    const [loading, setLoading] = useState(false); // 로딩 상태 추가

    // CSRF 토큰 가져오는 함수 (쿠키에서)
    const getCSRFToken = () => {
        const match = document.cookie.match(/(^|;) ?X-CSRF-Token=([^;]*)(;|$)/);
        return match ? match[2] : null; // CSRF 토큰 반환, 없으면 null
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 이미 제출 중이면 무시
        if (loading) return;

        if (!name || !content) {
            setError('Name and Content are required!');
            return;
        }

        setLoading(true); // 로딩 시작
        setError(null); // 기존 에러 메시지 초기화

        try {
            const response = await axios.post(
                '/api/entry',
                { name, content }, // 요청 본문에 데이터를 포함
                {
                    headers: {
                        'X-CSRF-Token': getCSRFToken(), // CSRF 토큰 추가
                    }
                }
            );
            console.log('Entry added:', response.data);
            
            // ApiResponse 형식 처리 후 Guestbook 상태에 추가
            let savedEntry;
            if (response.data && response.data.success) {
                savedEntry = response.data.data;
            } else {
                savedEntry = response.data; // 기존 형식 호환
            }
            
            // 입력 필드 초기화를 먼저 수행
            setName('');
            setContent('');
            setError(null); // 에러 초기화
            
            // 상태 업데이트는 마지막에 수행
            if (savedEntry) {
                addEntry(savedEntry);
            }
        } catch (error) {
            console.error('Error adding entry:', error);
            
            // 백엔드 에러 메시지 확인
            let errorMessage = 'Failed to add entry. Please try again.';
            
            if (error.response?.data) {
                const errorData = error.response.data;
                
                // ApiResponse ErrorResponse 형식 처리
                if (!errorData.success && errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (typeof errorData === 'string') {
                    errorMessage = errorData;
                }
                
                // HTTP 상태코드별 메시지
                switch (error.response.status) {
                    case 400:
                        errorMessage = errorData.message || '입력한 정보를 다시 확인해주세요.';
                        break;
                    case 500:
                        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
                        break;
                    default:
                        // 기본 메시지 유지
                }
            }
            
            console.log('Setting error message:', errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false); // 성공/실패와 관계없이 로딩 종료
        }
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
            <button 
                type="submit" 
                className="entry-form-button"
                disabled={loading}
            >
                {loading ? 'Submitting...' : 'Submit'}
            </button>
        </form>
    );
};

EntryForm.propTypes = {
    addEntry: PropTypes.func.isRequired
};

export default EntryForm;
