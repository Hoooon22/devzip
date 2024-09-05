// src/pages/Joke.js
import React, { useEffect, useState } from 'react';
import RandomJoke from '../components/Joke/RandomJoke';
import '../assets/css/Joke.scss';  // CSS 파일 추가

function Joke() {
    const [joke, setJoke] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchJoke = () => {
        setLoading(true);
        fetch('http://localhost:8080/api/joke')  // Spring Boot API 주소
            .then(response => response.json())
            .then(data => {
                setJoke(data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching the joke:", error);
                setLoading(false);
            });
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
            <button className="joke-button" onClick={fetchJoke}>New Joke</button>
        </div>
    );
}

export default Joke;
