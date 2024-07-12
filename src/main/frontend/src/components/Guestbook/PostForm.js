import React, { useState } from 'react';
import axios from 'axios';

const PostForm = ({ onNewPost, ip }) => {
    const [author, setAuthor] = useState('');
    const [content, setContent] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/posts', {
                author,
                content,
                ip // 클라이언트 IP 주소 전달
            });
            console.log('Post created:', response.data);
            onNewPost(response.data);
            setAuthor('');
            setContent('');
        } catch (error) {
            console.error('Error creating post:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="작성자"
                required
            />
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용"
                required
            />
            <button type="submit">게시</button>
        </form>
    );
};

export default PostForm;
