export const styles = {
  footer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: '20px 0',
    marginTop: '30px',
    borderTop: '1px solid #ddd',
  },
  footerContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  footerLink: {
    margin: '0 15px',
    textDecoration: 'none',
    color: '#333',
    transition: 'transform 0.2s ease',
    display: 'block',
    '&:hover': {
      transform: 'scale(1.1)',
    },
    '&:focus': {
      outline: '2px solid #0078d7',
      outlineOffset: '2px',
    },
  },
  iconStyle: {
    width: '30px',
    height: '30px',
    margin: '0 10px',
    border: '1px solid #ddd',
    borderRadius: '50%',
    padding: '5px',
  },
  // 반응형 스타일
  '@media (min-width: 768px)': {
    footerContent: {
      padding: '0 30px',
    },
    iconStyle: {
      width: '35px',
      height: '35px',
    },
  },
  '@media (min-width: 1024px)': {
    iconStyle: {
      width: '40px',
      height: '40px',
    },
  }
};