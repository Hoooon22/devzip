export const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: "'Noto Sans KR', Arial, sans-serif",
  },
  title: {
    fontSize: '2rem',
    textAlign: 'center',
    margin: '2rem 0',
    color: '#333',
  },
  projectList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    margin: '0',
    padding: '0',
    listStyle: 'none',
  },
  projectItem: {
    display: 'flex',
    height: '100%',
  },
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  },
  
  // 반응형 스타일
  '@media (min-width: 768px)': {
    container: {
      padding: '30px',
    },
    title: {
      fontSize: '2.5rem',
    },
    projectList: {
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '25px',
    },
  },
  
  '@media (min-width: 1024px)': {
    container: {
      padding: '40px',
    },
    title: {
      fontSize: '3rem',
      margin: '3rem 0',
    },
    projectList: {
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '30px',
    },
  },
  
  '@media (min-width: 1440px)': {
    projectList: {
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    },
  },
  
  // 다크 모드 지원
  '@media (prefers-color-scheme: dark)': {
    container: {
      backgroundColor: '#121212',
    },
    title: {
      color: '#ffffff',
    },
  }
};