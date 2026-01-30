import { Routes, Route, useLocation } from 'react-router-dom';
import { Container, Box } from '@mui/material';

import { WalletProvider } from './hooks/useWallet';
import { SolanaWalletProvider } from './hooks/useSolanaWallet';
import Header from './components/Header';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import InterNull from './pages/InterNull';
import History from './pages/History';
import Docs from './pages/Docs';
import PitchDeck from './pages/PitchDeck';
import TechnicalPaper from './pages/TechnicalPaper';

function App() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isDocs = location.pathname === '/docs';
  const isPitchDeck = location.pathname === '/pitch-deck';
  const isTechnicalPaper = location.pathname === '/technical-paper';

  // Determine if the page should have the standard container and header
  const useStandardLayout = !isLanding && !isDocs && !isPitchDeck && !isTechnicalPaper;

  return (
    <SolanaWalletProvider>
      <WalletProvider>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: useStandardLayout ? '#0a0e27' : 'transparent',
            background: useStandardLayout && `
              radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(240, 147, 251, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 20%, rgba(79, 172, 254, 0.1) 0%, transparent 50%),
              linear-gradient(180deg, #0a0e27 0%, #151933 100%)
            `,
          }}
        >
          {useStandardLayout && <Header />}

          <Routes>
            {/* Full-page routes that manage their own layout */}
            <Route path="/" element={<Landing />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/pitch-deck" element={<PitchDeck />} />
            <Route path="/technical-paper" element={<TechnicalPaper />} />

            {/* Routes that use the standard layout */}
            <Route
              path="/*"
              element={
                <Container maxWidth="lg" sx={{ flex: 1, py: 3 }}>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/deposit" element={<InterNull />} />
                    <Route path="/history" element={<History />} />
                  </Routes>
                </Container>
              }
            />
          </Routes>
        </Box>
      </WalletProvider>
    </SolanaWalletProvider>
  );
}

export default App;