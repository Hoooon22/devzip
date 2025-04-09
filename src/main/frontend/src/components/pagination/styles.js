export const styles = {
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    margin: '2rem 0',
  },
  pageList: {
    display: 'flex',
    padding: '0',
    margin: '0',
    listStyle: 'none',
  },
  pageItem: {
    margin: '0 3px',
  },
  pageButton: {
    minWidth: '40px',
    height: '40px',
    padding: '0 10px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    color: '#333',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: '#f1f1f1',
      borderColor: '#ccc',
    },
    '&:focus': {
      outline: '2px solid #0078d7',
      outlineOffset: '2px',
    },
  },
  activePageButton: {
    backgroundColor: '#0078d7',
    borderColor: '#0078d7',
    color: '#fff',
    fontWeight: 'bold',
    '&:hover': {
      backgroundColor: '#0062b1',
    },
  },
  
  // 반응형 스타일
  '@media (min-width: 768px)': {
    pageButton: {
      minWidth: '45px',
      height: '45px',
      fontSize: '1rem',
    },
    pageItem: {
      margin: '0 4px',
    },
  },
  
  '@media (min-width: 1024px)': {
    pageButton: {
      minWidth: '50px',
      height: '50px',
      fontSize: '1.1rem',
    },
    pageItem: {
      margin: '0 5px',
    },
  },
  
  // 다크 모드 지원
  '@media (prefers-color-scheme: dark)': {
    pageButton: {
      backgroundColor: '#333',
      borderColor: '#555',
      color: '#eee',
      '&:hover': {
        backgroundColor: '#444',
        borderColor: '#666',
      },
    },
    activePageButton: {
      backgroundColor: '#0078d7',
      borderColor: '#0078d7',
      color: '#fff',
      '&:hover': {
        backgroundColor: '#0062b1',
      },
    },
  }
};