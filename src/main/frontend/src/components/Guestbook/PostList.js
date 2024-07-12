// PostList.jsx 파일
import React from 'react';

const PostList = ({ posts }) => {
    return (
        <div className="post-list">
            {posts.map(post => (
                <div key={post.id} className="post">
                    <p>{post.content}</p>
                    <p>작성일: {post.date}</p>
                    <p>작성자 IP: {post.ip}</p>
                </div>
            ))}
        </div>
    );
};

export default PostList;
