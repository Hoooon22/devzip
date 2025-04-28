import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../assets/css/Pagination.scss';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Pagination = ({ projectsPerPage, totalProjects, paginate, currentPage = 1 }) => {
    const [activePage, setActivePage] = useState(currentPage);
    const pageNumbers = [];
    const totalPages = Math.ceil(totalProjects / projectsPerPage);
    
    // Create page numbers array
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }
    
    // Update active page when currentPage prop changes
    useEffect(() => {
        setActivePage(currentPage);
    }, [currentPage]);
    
    // Handle page change
    const handlePageChange = (number) => {
        setActivePage(number);
        paginate(number);
    };
    
    // Handle previous page
    const handlePrevious = () => {
        if (activePage > 1) {
            handlePageChange(activePage - 1);
        }
    };
    
    // Handle next page
    const handleNext = () => {
        if (activePage < totalPages) {
            handlePageChange(activePage + 1);
        }
    };
    
    // Determine which page numbers to show (for large number of pages)
    const getVisiblePageNumbers = () => {
        // For small number of pages, show all
        if (totalPages <= 7) return pageNumbers;
        
        // For larger number of pages, show a window around the current page
        let visiblePages = [];
        
        // Always include first and last page
        visiblePages.push(1);
        
        // Add ellipsis and pages around current page
        if (activePage > 3) visiblePages.push('...');
        
        // Pages around current
        for (let i = Math.max(2, activePage - 1); i <= Math.min(totalPages - 1, activePage + 1); i++) {
            visiblePages.push(i);
        }
        
        // Add ellipsis if needed
        if (activePage < totalPages - 2) visiblePages.push('...');
        
        // Add last page if not already included
        if (totalPages > 1) visiblePages.push(totalPages);
        
        return visiblePages;
    };

    return (
        <nav aria-label="Page navigation" className="pagination-container">
            <ul className="pagination">
                {/* Previous button */}
                <li className={`page-item ${activePage === 1 ? 'disabled' : ''}`}>
                    <button 
                        onClick={handlePrevious} 
                        className="page-link page-nav" 
                        aria-label="Previous page"
                        disabled={activePage === 1}
                    >
                        <FaChevronLeft aria-hidden="true" />
                    </button>
                </li>
                
                {/* Page numbers */}
                {getVisiblePageNumbers().map((item) => (
                    item === '...' ? (
                        <li key={`ellipsis-${item === '...' && getVisiblePageNumbers().indexOf(item)}`} className="page-item ellipsis">
                            <span className="page-ellipsis">...</span>
                        </li>
                    ) : (
                        <li key={item} className={`page-item ${activePage === item ? 'active' : ''}`}>
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    handlePageChange(item);
                                }} 
                                className="page-link"
                                aria-label={`Page ${item}`}
                                aria-current={activePage === item ? 'page' : undefined}
                            >
                                {item}
                            </button>
                        </li>
                    )
                ))}
                
                {/* Next button */}
                <li className={`page-item ${activePage === totalPages ? 'disabled' : ''}`}>
                    <button 
                        onClick={handleNext} 
                        className="page-link page-nav" 
                        aria-label="Next page"
                        disabled={activePage === totalPages}
                    >
                        <FaChevronRight aria-hidden="true" />
                    </button>
                </li>
            </ul>
            
            {/* Page info */}
            <div className="page-info" aria-live="polite">
                Page {activePage} of {totalPages}
            </div>
        </nav>
    );
};

Pagination.propTypes = {
    projectsPerPage: PropTypes.number.isRequired,
    totalProjects: PropTypes.number.isRequired,
    paginate: PropTypes.func.isRequired,
    currentPage: PropTypes.number,
};

export default Pagination;