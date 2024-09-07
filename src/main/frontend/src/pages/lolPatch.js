import React, { useEffect, useState } from 'react';
import axios from 'axios';

function LolPatch() {
    const [lolPatch, setLolPatch] = useState(null);

    const fetchLolPatch = async () => {
        try {
            console.log('Fetching patch...');
            const response = await axios.get('https://devzip.site/api/lolPatch');
            console.log('Fetched patch:', response.data);
            setLolPatch(response.data);
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
            <div className="patchBody">
                {lolPatch ? <div dangerouslySetInnerHTML={{ __html: lolPatch }} /> : 'Loading...'}
            </div>
        </div>
    );
}

export default LolPatch;
