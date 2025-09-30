import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import P2PService from '../services/P2PService';

const DebugContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: #0f0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  padding: 15px;
  border-radius: 8px;
  max-width: 400px;
  max-height: 500px;
  overflow-y: auto;
  z-index: 9999;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;

  ${props => props.minimized && `
    max-height: 40px;
    overflow: hidden;
  `}
`;

const DebugHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #0f0;
`;

const DebugTitle = styled.div`
  font-weight: bold;
  color: #0ff;
`;

const DebugButton = styled.button`
  background: transparent;
  border: 1px solid #0f0;
  color: #0f0;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  margin-left: 5px;

  &:hover {
    background: #0f0;
    color: #000;
  }
`;

const DebugRow = styled.div`
  margin: 5px 0;
  display: flex;
  justify-content: space-between;
`;

const DebugLabel = styled.span`
  color: #ff0;
`;

const DebugValue = styled.span`
  color: #0f0;
  
  ${props => props.error && `
    color: #f00;
  `}
  
  ${props => props.warning && `
    color: #fa0;
  `}
  
  ${props => props.success && `
    color: #0f0;
  `}
`;

const LogContainer = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #0f0;
  max-height: 200px;
  overflow-y: auto;
`;

const LogEntry = styled.div`
  font-size: 10px;
  margin: 2px 0;
  color: ${props => {
    if (props.type === 'error') return '#f00';
    if (props.type === 'warn') return '#fa0';
    if (props.type === 'success') return '#0f0';
    return '#0ff';
  }};
`;

const ToggleButton = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: #0f0;
  border: 2px solid #0f0;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  z-index: 9998;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
`;

function DebugPanel() {
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [stats, setStats] = useState({
    peerId: null,
    isConnected: false,
    connectionCount: 0,
    timestamp: Date.now()
  });
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Intercept console methods for logging
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog('info', args.join(' '));
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog('error', args.join(' '));
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog('warn', args.join(' '));
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    const updateStats = () => {
      setStats({
        peerId: P2PService.getPeerId(),
        isConnected: P2PService.isConnected(),
        connectionCount: P2PService.getConnectionCount(),
        timestamp: Date.now()
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  const addLog = (type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => {
      const newLogs = [...prev, { type, message, timestamp }];
      return newLogs.slice(-50); // Keep last 50 logs
    });
  };

  const runDiagnostics = () => {
    addLog('info', '=== Running Diagnostics ===');
    
    if (!P2PService.peer) {
      addLog('error', 'P2P Service not initialized');
      return;
    }
    
    addLog('success', `Peer ID: ${P2PService.getPeerId()}`);
    addLog('info', `Connected: ${P2PService.isConnected()}`);
    addLog('info', `Peers: ${P2PService.getConnectionCount()}`);
    
    if (P2PService.peer.destroyed) {
      addLog('error', 'Peer is destroyed');
    }
    
    if (P2PService.peer.disconnected) {
      addLog('warn', 'Peer is disconnected');
    }
    
    if (P2PService.connections.length === 0) {
      addLog('warn', 'No peer connections');
      addLog('info', 'Try: 1) Opening another tab, 2) Checking firewall, 3) Refreshing page');
    } else {
      addLog('success', `Connected to ${P2PService.connections.length} peer(s)`);
      P2PService.connections.forEach((conn, i) => {
        addLog('info', `  Peer ${i + 1}: ${conn.peer} (${conn.open ? 'open' : 'closed'})`);
      });
    }
    
    addLog('info', '=== Diagnostics Complete ===');
  };

  const testBroadcast = () => {
    addLog('info', 'Testing broadcast...');
    try {
      P2PService.broadcast({ type: 'DEBUG_TEST', message: 'Test broadcast', timestamp: Date.now() });
      addLog('success', 'Broadcast sent successfully');
    } catch (error) {
      addLog('error', `Broadcast failed: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs cleared');
  };

  if (!visible) {
    return (
      <ToggleButton onClick={() => setVisible(true)}>
        🔍 Debug Panel
      </ToggleButton>
    );
  }

  return (
    <DebugContainer minimized={minimized}>
      <DebugHeader>
        <DebugTitle>P2P Debug Panel</DebugTitle>
        <div>
          <DebugButton onClick={() => setMinimized(!minimized)}>
            {minimized ? '▼' : '▲'}
          </DebugButton>
          <DebugButton onClick={() => setVisible(false)}>
            ✕
          </DebugButton>
        </div>
      </DebugHeader>

      {!minimized && (
        <>
          <DebugRow>
            <DebugLabel>Peer ID:</DebugLabel>
            <DebugValue success={stats.peerId}>
              {stats.peerId ? stats.peerId.substring(0, 20) + '...' : 'None'}
            </DebugValue>
          </DebugRow>

          <DebugRow>
            <DebugLabel>Connected:</DebugLabel>
            <DebugValue success={stats.isConnected} error={!stats.isConnected}>
              {stats.isConnected ? 'Yes' : 'No'}
            </DebugValue>
          </DebugRow>

          <DebugRow>
            <DebugLabel>Active Peers:</DebugLabel>
            <DebugValue 
              success={stats.connectionCount > 0}
              warning={stats.connectionCount === 0}
            >
              {stats.connectionCount}
            </DebugValue>
          </DebugRow>

          <DebugRow>
            <DebugLabel>Last Update:</DebugLabel>
            <DebugValue>
              {new Date(stats.timestamp).toLocaleTimeString()}
            </DebugValue>
          </DebugRow>

          <DebugRow>
            <DebugButton onClick={runDiagnostics}>
              Run Diagnostics
            </DebugButton>
            <DebugButton onClick={testBroadcast}>
              Test Broadcast
            </DebugButton>
            <DebugButton onClick={clearLogs}>
              Clear Logs
            </DebugButton>
          </DebugRow>

          <LogContainer>
            <DebugLabel>Console Logs ({logs.length}/50):</DebugLabel>
            {logs.map((log, index) => (
              <LogEntry key={index} type={log.type}>
                [{log.timestamp}] {log.message}
              </LogEntry>
            ))}
          </LogContainer>
        </>
      )}
    </DebugContainer>
  );
}

export default DebugPanel;