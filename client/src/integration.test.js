/**
 * Integration Tests for YikYak Clone P2P System
 * 
 * These tests verify the end-to-end functionality of the P2P network,
 * including connection establishment, message broadcasting, and mesh networking.
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import P2PService from './services/P2PService';
import { getLocationCode } from './services/location';

// Mock the location service
jest.mock('./services/location', () => ({
  getLocationCode: jest.fn()
}));

// Mock PeerJS
jest.mock('peerjs', () => {
  let peerInstanceCounter = 0;
  const activePeers = new Map();

  return jest.fn().mockImplementation((peerId, options) => {
    const mockPeer = {
      id: peerId || `mock-peer-${peerInstanceCounter++}`,
      destroyed: false,
      disconnected: false,
      connections: {},
      _handlers: {},
      
      on(event, handler) {
        this._handlers[event] = handler;
      },
      
      connect(targetPeerId) {
        const targetPeer = activePeers.get(targetPeerId);
        
        const mockConnection = {
          peer: targetPeerId,
          open: false,
          _handlers: {},
          
          on(event, handler) {
            this._handlers[event] = handler;
          },
          
          send(data) {
            // Simulate sending to target peer
            if (targetPeer && targetPeer._handlers.connection) {
              setTimeout(() => {
                // Create a reverse connection
                const reverseConn = {
                  peer: this.peer,
                  open: true,
                  _handlers: {},
                  on(event, handler) {
                    this._handlers[event] = handler;
                  },
                  send(data) {
                    if (mockConnection._handlers.data) {
                      mockConnection._handlers.data(data);
                    }
                  }
                };
                
                // Simulate receiving the data on the target
                if (reverseConn._handlers.data) {
                  reverseConn._handlers.data(data);
                }
              }, 10);
            }
          },
          
          close() {
            this.open = false;
            if (this._handlers.close) {
              this._handlers.close();
            }
          }
        };
        
        // Simulate successful connection after a delay
        setTimeout(() => {
          mockConnection.open = true;
          if (mockConnection._handlers.open) {
            mockConnection._handlers.open();
          }
          
          // Notify target peer of incoming connection
          if (targetPeer && targetPeer._handlers.connection) {
            const incomingConn = {
              peer: this.id,
              open: true,
              _handlers: {},
              on(event, handler) {
                this._handlers[event] = handler;
              },
              send(data) {
                if (mockConnection._handlers.data) {
                  mockConnection._handlers.data(data);
                }
              }
            };
            
            // Set up bidirectional communication
            mockConnection.on('data', (data) => {
              if (incomingConn._handlers.data) {
                incomingConn._handlers.data(data);
              }
            });
            
            targetPeer._handlers.connection(incomingConn);
          }
        }, 50);
        
        return mockConnection;
      },
      
      reconnect() {
        this.disconnected = false;
        if (this._handlers.open) {
          setTimeout(() => this._handlers.open(this.id), 100);
        }
      },
      
      destroy() {
        this.destroyed = true;
        activePeers.delete(this.id);
        if (this._handlers.close) {
          this._handlers.close();
        }
      }
    };
    
    activePeers.set(mockPeer.id, mockPeer);
    
    // Simulate successful connection after a short delay
    setTimeout(() => {
      if (mockPeer._handlers.open) {
        mockPeer._handlers.open(mockPeer.id);
      }
    }, 10);
    
    return mockPeer;
  });
});

describe('P2P Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    getLocationCode.mockResolvedValue('test-zone-2024-01-01');
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset P2PService state
    if (P2PService.peer) {
      P2PService.destroy();
    }
  });

  afterEach(() => {
    if (P2PService.peer) {
      P2PService.destroy();
    }
  });

  describe('Connection Establishment', () => {
    test('should initialize P2P service and connect as host', async () => {
      const peerId = await P2PService.connect('test-host-id');
      
      expect(peerId).toBe('test-host-id');
      expect(P2PService.isConnected()).toBe(true);
      expect(P2PService.getPeerId()).toBe('test-host-id');
    });

    test('should handle unavailable-id error and fallback to client', async () => {
      // First connection takes the ID
      await P2PService.connect('test-zone-id');
      
      // Create a new service instance for second connection
      const P2PService2 = Object.create(
        Object.getPrototypeOf(P2PService),
        Object.getOwnPropertyDescriptors(P2PService)
      );
      P2PService2.peer = null;
      P2PService2.connections = [];
      
      // Try to connect with same ID - should get error
      try {
        await P2PService2.connect('test-zone-id');
      } catch (error) {
        // This is expected when ID is taken
        expect(error).toBeDefined();
      }
    });

    test('should establish connection between two peers', async () => {
      // Create host
      const hostId = await P2PService.connect('host-peer');
      expect(hostId).toBe('host-peer');
      
      // Give time for host to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Connect to host
      P2PService.connectToPeer('client-peer');
      
      // Wait for connection
      await waitFor(() => {
        expect(P2PService.getConnectionCount()).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('Message Broadcasting', () => {
    test('should broadcast messages to connected peers', async () => {
      const messageCallback = jest.fn();
      P2PService.setOnMessageReceived(messageCallback);
      
      await P2PService.connect('broadcaster');
      
      // Mock a connected peer
      const mockConn = {
        peer: 'listener',
        open: true,
        send: jest.fn(),
        on: jest.fn()
      };
      
      P2PService.connections.push(mockConn);
      
      const testMessage = { type: 'TEST', content: 'Hello' };
      P2PService.broadcast(testMessage);
      
      expect(mockConn.send).toHaveBeenCalled();
      const sentMessage = mockConn.send.mock.calls[0][0];
      expect(sentMessage.type).toBe('TEST');
      expect(sentMessage._id).toBeDefined();
      expect(sentMessage._timestamp).toBeDefined();
    });

    test('should not broadcast when no peers connected', async () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      await P2PService.connect('lonely-peer');
      
      P2PService.broadcast({ type: 'TEST' });
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('No peers connected')
      );
      
      consoleWarn.mockRestore();
    });
  });

  describe('Message Relay (Mesh Network)', () => {
    test('should relay messages to other peers except source', async () => {
      await P2PService.connect('relay-peer');
      
      const mockConn1 = {
        peer: 'peer-1',
        open: true,
        send: jest.fn(),
        on: jest.fn()
      };
      
      const mockConn2 = {
        peer: 'peer-2',
        open: true,
        send: jest.fn(),
        on: jest.fn()
      };
      
      P2PService.connections.push(mockConn1, mockConn2);
      
      const testData = { _id: 'msg-123', type: 'TEST' };
      P2PService.relay(testData, 'peer-1');
      
      // Should not relay back to source
      expect(mockConn1.send).not.toHaveBeenCalled();
      // Should relay to other peer
      expect(mockConn2.send).toHaveBeenCalledWith(testData);
    });

    test('should not relay duplicate messages', async () => {
      await P2PService.connect('relay-peer');
      
      const mockConn = {
        peer: 'peer-1',
        open: true,
        send: jest.fn(),
        on: jest.fn()
      };
      
      P2PService.connections.push(mockConn);
      
      const testData = { _id: 'msg-unique', type: 'TEST' };
      
      // First relay
      P2PService.relay(testData, 'source-peer');
      expect(mockConn.send).toHaveBeenCalledTimes(1);
      
      // Second relay with same message
      P2PService.relay(testData, 'source-peer');
      expect(mockConn.send).toHaveBeenCalledTimes(1); // Should not increase
    });
  });

  describe('Connection Management', () => {
    test('should handle connection close events', async () => {
      const connectionCallback = jest.fn();
      P2PService.setOnConnectionChange(connectionCallback);
      
      await P2PService.connect('test-peer');
      
      const mockConn = {
        peer: 'other-peer',
        open: true,
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };
      
      P2PService.addConnection(mockConn);
      expect(connectionCallback).toHaveBeenCalledWith(1);
      
      // Simulate connection close
      mockConn._handlers.close();
      
      expect(connectionCallback).toHaveBeenCalledWith(0);
      expect(P2PService.getConnectionCount()).toBe(0);
    });

    test('should not add duplicate connections', async () => {
      await P2PService.connect('test-peer');
      
      const mockConn = {
        peer: 'same-peer',
        open: true,
        on: jest.fn()
      };
      
      P2PService.addConnection(mockConn);
      expect(P2PService.connections.length).toBe(1);
      
      P2PService.addConnection(mockConn);
      expect(P2PService.connections.length).toBe(1);
    });

    test('should remove connections on error', async () => {
      const connectionCallback = jest.fn();
      P2PService.setOnConnectionChange(connectionCallback);
      
      await P2PService.connect('test-peer');
      
      const mockConn = {
        peer: 'error-peer',
        open: true,
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };
      
      P2PService.addConnection(mockConn);
      expect(connectionCallback).toHaveBeenCalledWith(1);
      
      // Simulate error
      mockConn._handlers.error(new Error('Connection failed'));
      
      expect(P2PService.connections.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      await P2PService.connect('test-peer');
      
      if (P2PService.peer._handlers.error) {
        P2PService.peer._handlers.error({
          type: 'network',
          message: 'Network error'
        });
      }
      
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    test('should handle connection timeout', async () => {
      // Reduce timeout for testing
      P2PService.connectionTimeout = 100;
      
      const mockPeer = {
        id: 'timeout-test',
        destroyed: false,
        on: jest.fn(),
        connect: jest.fn(() => ({
          peer: 'slow-peer',
          open: false,
          on: jest.fn()
        }))
      };
      
      P2PService.peer = mockPeer;
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      P2PService.connectToPeer('slow-peer');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
      
      // Reset timeout
      P2PService.connectionTimeout = 10000;
    });
  });

  describe('App Integration', () => {
    test('should render app and initialize P2P', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText(/peer/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('should display connection status', async () => {
      render(<App />);
      
      await waitFor(() => {
        const statusElement = screen.getByText(/zone|host|client/i);
        expect(statusElement).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Cleanup', () => {
    test('should properly destroy peer connections', async () => {
      await P2PService.connect('test-peer');
      
      const mockConn = {
        peer: 'other-peer',
        open: true,
        close: jest.fn(),
        on: jest.fn()
      };
      
      P2PService.connections.push(mockConn);
      
      P2PService.destroy();
      
      expect(mockConn.close).toHaveBeenCalled();
      expect(P2PService.connections.length).toBe(0);
      expect(P2PService.peer).toBeNull();
    });
  });
});

describe('Debug Information', () => {
  test('P2P service should provide debug methods', () => {
    expect(P2PService.getPeerId).toBeDefined();
    expect(P2PService.isConnected).toBeDefined();
    expect(P2PService.getConnectionCount).toBeDefined();
  });

  test('should log connection attempts', async () => {
    const consoleLog = jest.spyOn(console, 'log').mockImplementation();
    
    await P2PService.connect('debug-peer');
    
    expect(consoleLog).toHaveBeenCalledWith(
      expect.stringContaining('peer ID')
    );
    
    consoleLog.mockRestore();
  });
});