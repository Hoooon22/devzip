export const styles = {
  // 프로젝트 박스 기본 스타일
  projectBox: {
    display: 'block',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    textDecoration: 'none',
    color: '#333',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 5px 15px rgba(0, 0, 0, 0.15)',
    },
    '&:focus': {
      outline: '3px solid #0078d7',
      outlineOffset: '2px',
    },
  },
  
  // 비활성 프로젝트 스타일
  inactiveBox: {
    backgroundColor: '#f5f5f5',
    boxShadow: '0 1px 5px rgba(0, 0, 0, 0.05)',
    cursor: 'not-allowed',
  },
  
  // 프로젝트 제목 스타일
  projectTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#222',
  },
  
  // 비활성 제목 스타일
  inactiveTitle: {
    color: '#999',
  },
  
  // 프로젝트 설명 스타일
  projectDescription: {
    fontSize: '0.9rem',
    marginBottom: '15px',
    color: '#555',
    lineHeight: 1.5,
  },
  
  // 프로젝트 주소 스타일
  projectAddress: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#777',
    marginBottom: '8px',
    wordBreak: 'break-all',
  },
  
  // 프로젝트 기간 스타일
  projectDuration: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#777',
    marginBottom: '15px',
  },
  
  // 활성 프로젝트 아이콘
  permissionIcon: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#4CAF50',
  },
  
  // 비활성 프로젝트 아이콘
  inactiveIcon: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#F44336',
  },
  
  // 반응형 스타일
  '@media (min-width: 768px)': {
    projectTitle: {
      fontSize: '1.4rem',
    },
    projectDescription: {
      fontSize: '1rem',
    },
  },
  
  '@media (min-width: 1024px)': {
    projectBox: {
      padding: '25px',
    },
    projectTitle: {
      fontSize: '1.5rem',
    },
  }
};