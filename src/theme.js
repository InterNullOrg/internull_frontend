import { createTheme, alpha } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a0e27',
      paper: '#151933',
    },
    primary: {
      main: '#667eea',
      light: '#8b9ff0',
      dark: '#4a5cc5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f093fb',
      light: '#f4b3fc',
      dark: '#d670e7',
      contrastText: '#ffffff',
    },
    info: {
      main: '#4facfe',
      light: '#7bc1fe',
      dark: '#2c8ce5',
      contrastText: '#ffffff',
    },
    success: {
      main: '#00f2fe',
      light: '#4cf5ff',
      dark: '#00c4d4',
      contrastText: '#0a0e27',
    },
    error: {
      main: '#ff4757',
      light: '#ff6b7a',
      dark: '#d63642',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ffa502',
      light: '#ffb835',
      dark: '#cc8400',
      contrastText: '#0a0e27',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.95)',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 900,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          fontSize: '0.95rem',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
          },
        },
        contained: {
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
          '&:hover': {
            background: 'linear-gradient(90deg, #764ba2 0%, #667eea 100%)',
            boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.2)',
          color: 'rgba(255, 255, 255, 0.9)',
          '&:hover': {
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#151933',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(102, 126, 234, 0.2)',
            borderColor: 'rgba(102, 126, 234, 0.3)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.85rem',
        },
        filled: {
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#667eea',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        },
        head: {
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fontWeight: 700,
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid',
        },
        standardInfo: {
          backgroundColor: 'rgba(79, 172, 254, 0.1)',
          borderColor: 'rgba(79, 172, 254, 0.3)',
          color: '#4facfe',
        },
        standardSuccess: {
          backgroundColor: 'rgba(0, 242, 254, 0.1)',
          borderColor: 'rgba(0, 242, 254, 0.3)',
          color: '#00f2fe',
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 165, 2, 0.1)',
          borderColor: 'rgba(255, 165, 2, 0.3)',
          color: '#ffa502',
        },
        standardError: {
          backgroundColor: 'rgba(255, 71, 87, 0.1)',
          borderColor: 'rgba(255, 71, 87, 0.3)',
          color: '#ff4757',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          backgroundImage: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#151933',
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
        },
        bar: {
          background: 'linear-gradient(90deg, #667eea 0%, #f093fb 100%)',
          borderRadius: 4,
        },
      },
    },
  },
});

// Gradient helpers
export const gradients = {
  primary: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
  secondary: 'linear-gradient(90deg, #f093fb 0%, #4facfe 100%)',
  success: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)',
  dark: 'linear-gradient(180deg, #0a0e27 0%, #151933 100%)',
  card: (alpha = 0.03) => `linear-gradient(135deg, rgba(102, 126, 234, ${alpha}) 0%, rgba(244, 147, 251, ${alpha}) 100%)`,
};

// Box shadow helpers
export const shadows = {
  sm: '0 4px 12px rgba(0, 0, 0, 0.3)',
  md: '0 8px 24px rgba(0, 0, 0, 0.4)',
  lg: '0 12px 40px rgba(0, 0, 0, 0.5)',
  glow: (color) => `0 8px 32px ${alpha(color, 0.4)}`,
};

export default theme;