import React, { useState, useEffect } from 'react';
import EntryForm from '../components/guestbook/EntryForm';
import EntryList from '../components/guestbook/EntryList';
import axios from '../utils/axiosConfig'; // axiosConfig에서 설정된 axios 사용
import '../assets/css/Guestbook.scss';

const Guestbook = () => {
    const [entries, setEntries] = useState([]);

    // API에서 guestbook 엔트리 목록을 가져오는 함수 (GET)
    const fetchEntries = async () => {
        try {
            const response = await axios.get('/api/entry');
            // ApiResponse 형식 처리
            if (response.data && response.data.success) {
                setEntries(response.data.data);
                console.log('Fetched entries:', response.data.data);
            } else {
                setEntries(response.data); // 기존 형식 호환
                console.log('Fetched entries (legacy format):', response.data);
            }
        } catch (error) {
            console.error('Error fetching entries:', error);
            console.error('Response data:', error.response?.data);
        }
    };

    // 새로운 엔트리를 상태에 추가하는 함수 (EntryForm에서 이미 API 호출 완료된 데이터를 받음)
    const addEntry = (savedEntry) => {
        console.log('Adding entry to state:', savedEntry);
        setEntries((prevEntries) => [...prevEntries, savedEntry]);
    };

    // 엔트리를 상태에서 제거하는 함수
    const deleteEntry = (entryId) => {
        console.log('Deleting entry from state:', entryId);
        setEntries((prevEntries) => prevEntries.filter(entry => entry.id !== entryId));
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    return (
        <div className="guestbook-container">
            <h1>Guestbook</h1>
            <EntryForm addEntry={addEntry} />
            <EntryList entries={entries} onDeleteEntry={deleteEntry} />
        </div>
    );
};

export default Guestbook;
