import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Header from './components/Header';
import YakForm from './components/YakForm';
import YakFeed from './components/YakFeed';
import Welcome from './components/Welcome';
import DebugPanel from './components/DebugPanel';
import P2PService from './services/P2PService';
import { getLocationCode } from './services/location';
import './App.css';

const AppWrapper = styled.div`
  background: linear-gradient(to bottom, #f0f2f5 0%, #e8eaf0 100%);
  min-height: 100vh;
`;

const StatusBar = styled.div`
  padding: 12px;
  background: ${props => {
    if (props.status.includes('Error')) return '#ffebee';
    if (props.status.includes('Connected') || props.status.includes('host')) return '#e8f5e9';
    return '#fff9e6';
  }};
  border-bottom: 1px solid ${props => {
    if (props.status.includes('Error')) return '#ef9a9a';
    if (props.status.includes('Connected') || props.status.includes('host')) return '#a5d6a7';
    return '#ffe58f';
  }};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  color: #555;
  transition: all 0.3s;
  flex-wrap: wrap;
  gap: 10px;
`;

const StatusText = styled.div`
  flex: 1;
  text-align: center;
`;

const ConnectionBadge = styled.div`
  background: ${props => props.count > 0 ? '#4CAF50' : '#999'};
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 40px;
`;

const YAK_CACHE_KEY = 'yikyak_clone_cache';
const WELCOME_SEEN_KEY = 'yikyak_welcome_seen';

function App() {
  const [yaks, setYaks] = useState([]);
  const [peerId, setPeerId] = useState(null);
  const [status, setStatus] = useState('Initializing...');
  const [showWelcome, setShowWelcome] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);

  // Check if user has seen welcome screen
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(WELCOME_SEEN_KEY);
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  // Load from cache on initial render
  useEffect(() => {
    const cachedYaks = JSON.parse(localStorage.getItem(YAK_CACHE_KEY) || '[]');
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const validYaks = cachedYaks.filter(yak => (now - yak.timestamp) < twentyFourHours);
    setYaks(validYaks);
  }, []);

  // Save to cache whenever yaks change
  useEffect(() => {
    if (yaks.length > 0) {
      localStorage.setItem(YAK_CACHE_KEY, JSON.stringify(yaks));
    }
  }, [yaks]);

  useEffect(() => {
    // Store timer IDs for cleanup
    const timers = [];
    
    const init = async () => {
      // Setup connection change handler
      P2PService.setOnConnectionChange((count) => {
        setConnectionCount(count);
        if (count > 0) {
          setStatus(prev => {
            if (prev.includes('Error')) {
              return prev.replace('Error: ', '');
            }
            return prev;
          });
        }
      });

      // Setup message handler
      P2PService.setOnMessageReceived((data) => {
        if (data.type === 'NEW_YAK') {
          setYaks(prevYaks => {
            if (prevYaks.find(y => y.id === data.payload.id)) {
              return prevYaks;
            }
            return [data.payload, ...prevYaks];
          });
        } else if (data.type === 'VOTE') {
          setYaks(prevYaks => {
            return prevYaks.map(yak => {
              if (yak.id === data.payload.yakId) {
                const votes = { ...yak.votes };
                const { voterId, voteType } = data.payload;

                // Apply the vote
                if (votes[voterId] === voteType) {
                  delete votes[voterId];
                } else {
                  votes[voterId] = voteType;
                }

                // Recalculate score
                const score = Object.values(votes).reduce((sum, vote) => {
                  return sum + (vote === 'up' ? 1 : -1);
                }, 0);

                return { ...yak, votes, score };
              }
              return yak;
            });
          });
        }
      });

      setStatus('Getting location code...');
      let locationCode;
      
      try {
        locationCode = await getLocationCode();
        setStatus(`Location detected. Zone: ${locationCode}`);
      } catch (error) {
        setStatus('Warning: Could not get location. Using fallback zone.');
        console.error("Location error:", error);
        locationCode = await getLocationCode(); // Will use fallback
      }

      // Attempt to become host
      try {
        setStatus(`Attempting to become host for zone: ${locationCode}...`);
        const hostId = await P2PService.connect(locationCode);
        setPeerId(hostId);
        setStatus(`✓ This device is the host for zone: ${locationCode}. Waiting for peers...`);
        
        // Set a timer to check if we got any connections
        const hostCheckTimer = setTimeout(() => {
          if (P2PService.getConnectionCount() === 0) {
            setStatus(`Host active (${locationCode}). No peers yet - try opening another tab or share with friends!`);
          }
        }, 5000);
        timers.push(hostCheckTimer);
      } catch (error) {
        console.log("Host connection error:", error);
        
        // If ID is unavailable, connect as client
        if (error.type === 'unavailable-id') {
          setStatus(`Host exists. Connecting as client...`);
          
          try {
            // Connect with random ID
            const myId = await P2PService.connect();
            setPeerId(myId);
            setStatus(`✓ Connected as client (ID: ${myId.substring(0, 8)}...). Linking to host...`);
            
            // Give the peer a moment to fully initialize
            await new Promise(resolve => {
              const delayTimer = setTimeout(resolve, 1000);
              timers.push(delayTimer);
            });
            
            // Connect to the zone host
            P2PService.connectToPeer(locationCode);
            
            // Wait for connection to establish
            let attempts = 0;
            const maxAttempts = 10;
            const checkConnection = setInterval(() => {
              const count = P2PService.getConnectionCount();
              attempts++;
              
              if (count > 0) {
                clearInterval(checkConnection);
                setStatus(`✓ Connected to ${count} peer(s) in zone: ${locationCode}`);
              } else if (attempts >= maxAttempts) {
                clearInterval(checkConnection);
                setStatus(`Warning: Connected to network but no peers found. You can still post!`);
              } else {
                setStatus(`Connecting to peers... (attempt ${attempts}/${maxAttempts})`);
              }
            }, 1000);
            timers.push(checkConnection);
            
          } catch (clientError) {
            setStatus('Error: Failed to connect as client. Check console for details.');
            console.error("Client connection error:", clientError);
            
            // Provide recovery options
            const errorTimer = setTimeout(() => {
              setStatus('Error: Connection failed. Try refreshing the page or check your internet connection.');
            }, 2000);
            timers.push(errorTimer);
          }
        } else if (error.message && error.message.includes('timeout')) {
          setStatus('Error: Connection timeout. Check your internet connection or firewall settings.');
          console.error("Connection timeout:", error);
        } else {
          setStatus('Error: Could not initialize P2P. Check console for details.');
          console.error("P2P initialization error:", error);
        }
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      // Clear all timers to prevent memory leaks and React warnings
      timers.forEach(timer => {
        clearTimeout(timer);
        clearInterval(timer);
      });
      // Note: We don't destroy P2PService here as it's a singleton
      // In a real app, you might want to handle this differently
    };
  }, []);

  const handleNewYak = (text) => {
    if (!peerId) {
      alert('P2P connection not established yet. Please wait.');
      return;
    }
    const newYak = {
      id: `${peerId}-${Date.now()}`,
      text,
      score: 0,
      timestamp: Date.now(),
      votes: {},
    };

    setYaks(prevYaks => [newYak, ...prevYaks]);
    P2PService.broadcast({ type: 'NEW_YAK', payload: newYak });
  };

  const handleVote = (yakId, voteType) => {
    if (!peerId) {
      return;
    }

    setYaks(prevYaks => {
      return prevYaks.map(yak => {
        if (yak.id === yakId) {
          const votes = { ...yak.votes };
          const previousVote = votes[peerId];

          // Toggle vote logic
          if (previousVote === voteType) {
            delete votes[peerId];
          } else {
            votes[peerId] = voteType;
          }

          // Calculate new score
          const score = Object.values(votes).reduce((sum, vote) => {
            return sum + (vote === 'up' ? 1 : -1);
          }, 0);

          return { ...yak, votes, score };
        }
        return yak;
      });
    });

    P2PService.broadcast({ 
      type: 'VOTE', 
      payload: { yakId, voteType, voterId: peerId } 
    });
  };

  const handleCloseWelcome = () => {
    localStorage.setItem(WELCOME_SEEN_KEY, 'true');
    setShowWelcome(false);
  };

  return (
    <AppWrapper>
      {showWelcome && <Welcome onClose={handleCloseWelcome} />}
      <Header />
      <StatusBar status={status}>
        <StatusText>{status}</StatusText>
        <ConnectionBadge count={connectionCount}>
          🌐 {connectionCount} peer{connectionCount !== 1 ? 's' : ''}
        </ConnectionBadge>
      </StatusBar>
      <Container>
        <YakForm onSubmit={handleNewYak} />
        <YakFeed yaks={yaks} onVote={handleVote} currentUserId={peerId} />
      </Container>
      {process.env.NODE_ENV !== 'test' && <DebugPanel />}
    </AppWrapper>
  );
}

export default App;
