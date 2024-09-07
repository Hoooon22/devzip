// src/pages/LolPatch.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function LolPatch() {
    const [lolPatch, setLolPatch] = useState(null);

    // 함수
    const fetchLolPatch = async () => {
        try {
            const response = await axios.get('https://devzip.site/api/lolpatch');
            setLolPatch(response.data);
            console.log('Fetched patch:', response.data);
        } catch (error) {
            console.error('Error fetching patch:', error);
            if (error.response) {
                console.error('Error Response:', error.response);
            }
            if (error.request) {
                console.error('Error Request:', error.request);
            }
            console.error('Error Message:', error.message);
        } 
    }    

    useEffect(() => {
        fetchLolPatch();
    }, []);

    return (
        <div className="lolPatch-container">
            <h1 className="title">LoL Patch xxx</h1>
                <div className="patchBody" dangerouslySetInnerHTML={{ __html: lolPatch }} />
        </div>
    );
}

export default LolPatch;