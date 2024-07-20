import React from 'react';
import PropTypes from 'prop-types';

const EntryList = ({ entries }) => {
    return (
        <ul className="post-list">
            {entries.map(entry => (
                <li
                    key={entry.id}
                    className="post-item"
                    style={{ backgroundColor: entry.color }} // 색상 적용
                >
                    <strong style={{ color: entry.color }}>{entry.title}</strong>
                    <p>{entry.content}</p>
                </li>
            ))}
        </ul>
    );
};

EntryList.propTypes = {
    entries: PropTypes.array.isRequired
};

export default EntryList;
