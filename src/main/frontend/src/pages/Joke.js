// src/pages/Joke.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RandomJoke from '../components/Joke/RandomJoke';
import '../assets/css/Joke.scss';  // CSS 파일 추가

function Joke() {
    const [joke, setJoke] = useState(null);
    const [loading, setLoading] = useState(false);

    // 농담을 가져오는 함수
    const fetchJoke = async () => {
        setLoading(true);
        try {
            const response = await axios.get('https://devzip.site/api/joke'); // Spring Boot API 주소
            setJoke(response.data);
            console.log('Fetched joke:', response.data);
        } catch (error) {
            console.error('Error fetching joke:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJoke();
    }, []);

    return (
        <div className="joke-container">
            <h1 className="title">Get a Random Joke</h1>
            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                joke && <RandomJoke joke={joke} />
            )}
            {/* 버튼이 항상 보이도록 함 */}
            <button className="joke-button" onClick={fetchJoke}>New Joke</button>
        </div>
    );
}

export default Joke;
