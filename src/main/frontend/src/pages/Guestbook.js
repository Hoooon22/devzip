import React, { useState, useEffect } from 'react';
import EntryForm from '../components/guestbook/EntryForm';
import EntryList from '../components/guestbook/EntryList';

const Guestbook = () => {
    const [entries, setEntries] = useState([]);

    const addEntry = (entry) => {
        setEntries([entry, ...entries]);
    };

    useEffect(() => {
        console.log("Updated entries:", entries);
    }, [entries]);

    return (
        <div className="Guestbook">
            <h1>Guestbook</h1>
            <EntryForm addEntry={addEntry} />
            <EntryList entries={entries} />
        </div>
    );
};

export default Guestbook;
