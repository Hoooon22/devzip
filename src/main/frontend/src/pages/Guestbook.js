import React, { useState, useEffect } from 'react';
import EntryForm from '../components/guestbook/EntryForm';
import EntryList from '../components/guestbook/EntryList';
import axios from 'axios';
import '../assets/css/Guestbook.scss';

const Guestbook = () => {
    const [entries, setEntries] = useState([]);

    const fetchEntries = async () => {
        try {
            const response = await axios.get('/api/v1/entries');
            setEntries(response.data);
            console.log('Fetched entries:', response.data);
        } catch (error) {
            console.error('Error fetching entries:', error);
        }
    };

    const addEntry = async (newEntry) => {
        try {
            const response = await axios.post('/api/v1/entries', newEntry);
            console.log('Added new entry:', response.data);
            setEntries([...entries, response.data]); // 새 항목을 기존 목록에 추가
        } catch (error) {
            console.error('Error adding entry:', error);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    return (
        <div className="guestbook-container">
            <h1>Guestbook</h1>
            <EntryForm addEntry={addEntry} />
            <EntryList entries={entries} />
        </div>
    );
};

export default Guestbook;
