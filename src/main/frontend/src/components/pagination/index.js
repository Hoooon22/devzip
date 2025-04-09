import React from 'react';
import PropTypes from 'prop-types';
import { styles } from './styles';

const Pagination = ({ projectsPerPage, totalProjects, paginate, currentPage }) => {
  const pageNumbers = [];

  // 페이지 번호 생성
  for (let i = 1; i <= Math.ceil(totalProjects / projectsPerPage); i++) {
    pageNumbers.push(i);
  }

  // 보여줄 페이지 범위 계산 (현재 페이지 주변 2개 페이지)
  const getVisiblePageNumbers = () => {
    const maxPagesToShow = 5;
    
    if (pageNumbers.length <= maxPagesToShow) {
      return pageNumbers;
    }

    const halfWay = Math.floor(maxPagesToShow / 2);
    let startPage = currentPage - halfWay;
    let endPage = currentPage + halfWay;

    if (startPage <= 0) {
      endPage -= (startPage - 1);
      startPage = 1;
    }

    if (endPage > pageNumbers.length) {
      endPage = pageNumbers.length;
      if (endPage - maxPagesToShow + 1 > 0) {
        startPage = endPage - maxPagesToShow + 1;
      }
    }

    return pageNumbers.slice(startPage - 1, endPage);
  };

  const visiblePages = getVisiblePageNumbers();

  return (
    <nav style={styles.pagination} aria-label="페이지 네비게이션">
      <ul style={styles.pageList}>
        {/* 첫 페이지 버튼 */}
        {currentPage > 1 && (
          <li style={styles.pageItem}>
            <button
              onClick={() => paginate(1)}
              style={styles.pageButton}
              aria-label="첫 페이지로 이동"
            >
              &laquo;
            </button>
          </li>
        )}
        
        {/* 이전 페이지 버튼 */}
        {currentPage > 1 && (
          <li style={styles.pageItem}>
            <button
              onClick={() => paginate(currentPage - 1)}
              style={styles.pageButton}
              aria-label="이전 페이지로 이동"
            >
              &lsaquo;
            </button>
          </li>
        )}
        
        {/* 페이지 번호 */}
        {visiblePages.map(number => (
          <li key={number} style={styles.pageItem}>
            <button
              onClick={() => paginate(number)}
              style={{
                ...styles.pageButton,
                ...(currentPage === number ? styles.activePageButton : {})
              }}
              aria-label={`${number} 페이지`}
              aria-current={currentPage === number ? 'page' : undefined}
            >
              {number}
            </button>
          </li>
        ))}
        
        {/* 다음 페이지 버튼 */}
        {currentPage < pageNumbers.length && (
          <li style={styles.pageItem}>
            <button
              onClick={() => paginate(currentPage + 1)}
              style={styles.pageButton}
              aria-label="다음 페이지로 이동"
            >
              &rsaquo;
            </button>
          </li>
        )}
        
        {/* 마지막 페이지 버튼 */}
        {currentPage < pageNumbers.length && (
          <li style={styles.pageItem}>
            <button
              onClick={() => paginate(pageNumbers.length)}
              style={styles.pageButton}
              aria-label="마지막 페이지로 이동"
            >
              &raquo;
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};

Pagination.propTypes = {
  projectsPerPage: PropTypes.number.isRequired,
  totalProjects: PropTypes.number.isRequired,
  paginate: PropTypes.func.isRequired,
  currentPage: PropTypes.number.isRequired
};

export default Pagination;