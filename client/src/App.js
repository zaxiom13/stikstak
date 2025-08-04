import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Header from './components/Header';
import YakForm from './components/YakForm';
import YakFeed from './components/YakFeed';
import P2PService from './services/P2PService';
import { getLocationCode } from './services/location';
import './App.css';

const AppWrapper = styled.div`
  background-color: #f0f2f5;
  min-height: 100vh;
`;

const Status = styled.div`
  padding: 10px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  text-align: center;
`;

const YAK_CACHE_KEY = 'yikyak_clone_cache';

function App() {
  const [yaks, setYaks] = useState([]);
  const [peerId, setPeerId] = useState(null);
  const [status, setStatus] = useState('Initializing...');

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
    const init = async () => {
      // Setup message handler
      P2PService.setOnMessageReceived((data) => {
        if (data.type === 'NEW_YAK') {
          setYaks(prevYaks => {
            if (prevYaks.find(y => y.id === data.payload.id)) {
              return prevYaks;
            }
            return [data.payload, ...prevYaks];
          });
        }
      });

      setStatus('Getting location code...');
      const locationCode = await getLocationCode();

      try {
        setStatus(`Trying to become host for zone: ${locationCode}`);
        await P2PService.connect(locationCode);
        setPeerId(locationCode);
        setStatus(`This device is the host for zone: ${locationCode}`);
      } catch (error) {
        if (error.type === 'unavailable-id') {
          // ID is taken, so we connect as a client.
          setStatus(`Zone host found. Connecting as a client...`);
          try {
            const myId = await P2PService.connect(); // Connect with random ID
            setPeerId(myId);
            setStatus(`Connected as client with ID: ${myId}. Linking to host...`);
            P2PService.connectToPeer(locationCode);
            setStatus(`Connection established with host in zone: ${locationCode}`);
          } catch (clientError) {
            setStatus('Error: Failed to connect as a client.');
            console.error("Client connection error:", clientError);
          }
        } else {
          setStatus('Error: Could not initialize P2P connection.');
          console.error("P2P initialization error:", error);
        }
      }
    };

    init();
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
    };

    setYaks(prevYaks => [newYak, ...prevYaks]);
    P2PService.broadcast({ type: 'NEW_YAK', payload: newYak });
  };

  return (
    <AppWrapper>
      <Header />
      <Status>{status}</Status>
      <YakForm onSubmit={handleNewYak} />
      <YakFeed yaks={yaks} />
    </AppWrapper>
  );
}

export default App;
