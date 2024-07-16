// Guestbook.js
import React, { useState, useEffect } from 'react';
import EntryForm from '../components/guestbook/EntryForm';
import EntryList from '../components/guestbook/EntryList';
import axios from 'axios';

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
            setEntries([response.data, ...entries]);
            console.log('Added new entry:', response.data);
        } catch (error) {
            console.error('Error adding entry:', error);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    return (
        <div className="Guestbook">
            <h1>Guestbook</h1>
            <EntryForm addEntry={addEntry} />
            <EntryList entries={entries} />
        </div>
    );
};

export default Guestbook;
