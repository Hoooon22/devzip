import React from 'react';

const PostList = ({ posts }) => {
    return (
        <div className="post-list">
            {posts.map(post => (
                <div key={post.id} className="post-item">
                    <p>{post.content}</p>
                    <small>{post.ip}</small>
                </div>
            ))}
        </div>
    );
};

export default PostList;
