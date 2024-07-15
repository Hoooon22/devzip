import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EntryForm = ({ addEntry }) => {
    const [newEntry, setNewEntry] = useState('');
    const [ip, setIp] = useState('');

    useEffect(() => {
        // IP 주소를 가져오기 위해 외부 API 호출
        const fetchIp = async () => {
            try {
                const response = await axios.get('https://api.ipify.org?format=json');
                setIp(response.data.ip);
            } catch (error) {
                console.error('Error fetching IP:', error);
            }
        };

        fetchIp();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newEntry.trim()) {
            addEntry(`${ip}: ${newEntry}`);
            setNewEntry('');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input 
                type="text" 
                value={newEntry} 
                onChange={(e) => setNewEntry(e.target.value)} 
                placeholder="Write a message..."
            />
            <button type="submit">Submit</button>
        </form>
    );
};

export default EntryForm;
