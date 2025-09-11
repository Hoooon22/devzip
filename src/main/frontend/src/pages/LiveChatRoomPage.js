import React from 'react';
import { useParams } from 'react-router-dom';

function LiveChatRoomPage() {
    let { roomId } = useParams();

    return (
        <div>
            <h2>Chat Room #{roomId}</h2>
            {/* Chat messages will go here */}
            <div style={{ border: '1px solid #ccc', height: '300px', overflowY: 'scroll', padding: '10px', marginBottom: '10px' }}>
                <p>Message 1</p>
                <p>Message 2</p>
            </div>
            {/* Message input will go here */}
            <input type="text" placeholder="Enter message" style={{ width: '80%' }} />
            <button>Send</button>
        </div>
    );
}

export default LiveChatRoomPage;
