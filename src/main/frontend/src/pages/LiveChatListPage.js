import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { Link, useNavigate } from 'react-router-dom';

function LiveChatListPage() {
    const [rooms, setRooms] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const response = await axios.get('/api/livechat/rooms');
            setRooms(response.data);
        } catch (error) {
            console.error('Error fetching chat rooms:', error);
        }
    };

    const createRoom = async () => {
        const roomName = prompt('Enter new chat room name:');
        if (roomName) {
            try {
                const response = await axios.post('/api/livechat/rooms', { name: roomName });
                navigate(`/livechat/${response.data.id}`);
            } catch (error) {
                console.error('Error creating chat room:', error);
            }
        }
    };

    return (
        <div>
            <h2>Live Chat Rooms</h2>
            <button onClick={createRoom}>Create New Chat Room</button>
            <ul>
                {rooms.map(room => (
                    <li key={room.id}>
                        <Link to={`/livechat/${room.id}`}>
                            {room.name} (created by {room.creatorName})
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default LiveChatListPage;
