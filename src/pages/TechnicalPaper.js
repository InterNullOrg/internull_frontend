import React from 'react';
import { Box, IconButton, AppBar, Toolbar, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { MinimalistDarkLogo } from '../components/LogoComponents';

const TechnicalPaper = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#0a0e27',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Navigation Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(10, 14, 39, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <MinimalistDarkLogo height={48} style={{ marginRight: 16 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'white' }}>
            Technical Paper
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Iframe Container */}
      <Box sx={{
        flex: 1,
        bgcolor: 'white',
        width: '100%',
        height: 'calc(100vh - 64px)', // Full viewport height minus AppBar
        overflow: 'hidden'
      }}>
        <iframe
          src="/internull-paper-expanded.html"
          title="InterNull Technical Paper"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            minHeight: 'calc(100vh - 64px)'
          }}
        />
      </Box>
    </Box>
  );
};

export default TechnicalPaper;
