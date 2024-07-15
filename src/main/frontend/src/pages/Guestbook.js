import React, { useState, useEffect } from 'react';
import EntryForm from '../components/guestbook/EntryForm';
import EntryList from '../components/guestbook/EntryList';

import axios from 'axios';

const Guestbook = () => {
    const [entries, setEntries] = useState([]);

    const fetchEntries = async () => {
        try {
            const response = await axios.get('/api/entries');
            setEntries(response.data);
        } catch (error) {
            console.error('Error fetching entries:', error);
        }
    };

    const addEntry = async (entry) => {
        try {
            const response = await axios.post('/api/entries', { content: entry });
            setEntries([response.data, ...entries]);
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