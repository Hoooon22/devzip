// PostForm.jsx 파일
import React, { useState } from 'react';

const PostForm = ({ onNewPost, ip }) => {
    const [content, setContent] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content) return;
        
        const newPost = { content };
        onNewPost(newPost);
        setContent('');
    };

    return (
        <form onSubmit={handleSubmit}>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="글을 입력하세요..."
                rows={5}
            />
            <button type="submit">작성하기</button>
            <p>작성자 IP: {ip}</p> {/* 작성자 IP 표시 */}
        </form>
    );
};

export default PostForm;
