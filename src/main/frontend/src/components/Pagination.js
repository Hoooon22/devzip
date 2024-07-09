import React from 'react';
import PropTypes from 'prop-types';
import "../assets/css/Pagination.scss"; // SCSS 파일 임포트

const Pagination = ({ projectsPerPage, totalProjects, paginate }) => {
    const pageNumbers = [];

    for (let i = 1; i <= Math.ceil(totalProjects / projectsPerPage); i++) {
        pageNumbers.push(i);
    }

    return (
        <nav>
            <ul className="pagination">
                {pageNumbers.map(number => (
                    <li key={number} className="page-item">
                        <a onClick={() => paginate(number)} href="!#" className="page-link">
                            {number}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

Pagination.propTypes = {
    projectsPerPage: PropTypes.number.isRequired,
    totalProjects: PropTypes.number.isRequired,
    paginate: PropTypes.func.isRequired,
};

export default Pagination;
