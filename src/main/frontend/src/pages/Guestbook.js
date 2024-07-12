import React, { useState, useEffect } from 'react';
import PostForm from '../components/Guestbook/PostForm';
import PostList from '../components/Guestbook/PostList';
import Pagination from '../components/Guestbook/Pagination';
import IPFetcher from '../components/Guestbook/IPFetcher'; // IPFetcher 컴포넌트 임포트
import "../assets/css/Guestbook.scss";

const Guestbook = () => {
    const [posts, setPosts] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [formattedIP, setFormattedIP] = useState("");

    const handleNewPost = (newPost) => {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
        const post = { ...newPost, date, id: posts.length + 1, ip: formattedIP }; // IP 주소 추가
        setPosts([post, ...posts]); // 새로운 글을 맨 앞에 추가
    };

    const onIPFetched = (ip) => {
        setFormattedIP(ip);
    };

    // 페이지네이션 로직
    const postsPerPage = 5; // 페이지당 글 수
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    const currentPosts = posts.slice(indexOfFirstPost, indexOfLastPost);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="guestbook">
            <h1>익명 방명록</h1>
            <IPFetcher onIPFetched={onIPFetched} /> {/* IPFetcher 컴포넌트 사용 */}
            <PostForm onNewPost={handleNewPost} ip={formattedIP} /> {/* IP 주소 전달 */}
            <PostList posts={currentPosts} />
            <Pagination
                postsPerPage={postsPerPage}
                totalPosts={posts.length}
                paginate={paginate}
            />
        </div>
    );
};

export default Guestbook;
