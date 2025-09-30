import P2PService from './P2PService';

// Mock PeerJS
jest.mock('peerjs', () => {
  return jest.fn().mockImplementation((peerId, options) => {
    const mockPeer = {
      id: peerId || `mock-peer-${Math.random()}`,
      connections: {},
      _handlers: {},
      
      on(event, handler) {
        this._handlers[event] = handler;
      },
      
      connect(targetPeerId) {
        const mockConnection = {
          peer: targetPeerId,
          open: false,
          _handlers: {},
          
          on(event, handler) {
            this._handlers[event] = handler;
          },
          
          send(data) {
            // Simulate sending
            console.log('Mock send:', data);
          },
          
          // Simulate opening the connection
          _simulateOpen() {
            this.open = true;
            if (this._handlers.open) {
              this._handlers.open();
            }
          },
          
          _simulateData(data) {
            if (this._handlers.data) {
              this._handlers.data(data);
            }
          },
          
          _simulateClose() {
            this.open = false;
            if (this._handlers.close) {
              this._handlers.close();
            }
          }
        };
        return mockConnection;
      },
      
      // Simulate successful peer initialization
      _simulateOpen() {
        if (this._handlers.open) {
          this._handlers.open(this.id);
        }
      },
      
      _simulateError(error) {
        if (this._handlers.error) {
          this._handlers.error(error);
        }
      },
      
      _simulateConnection(conn) {
        if (this._handlers.connection) {
          this._handlers.connection(conn);
        }
      },
      
      destroy() {
        // Cleanup
      }
    };
    
    return mockPeer;
  });
});

describe('P2PService', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset the service state
    if (P2PService.peer && typeof P2PService.peer.destroy === 'function') {
      try {
        P2PService.peer.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    P2PService.peer = null;
    P2PService.connections = [];
    P2PService.seenMessages = {};
    P2PService.onMessageReceived = () => {};
    P2PService.onConnectionChange = () => {};
    P2PService.reconnectAttempts = 0;
  });

  afterEach(() => {
    if (P2PService.peer && typeof P2PService.peer.destroy === 'function') {
      try {
        P2PService.peer.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    P2PService.peer = null;
    P2PService.connections = [];
  });

  describe('connect()', () => {
    test('should successfully connect with a peer ID', async () => {
      const connectPromise = P2PService.connect('test-peer-id');
      
      // Simulate successful connection
      setTimeout(() => {
        P2PService.peer._simulateOpen();
      }, 10);
      
      const peerId = await connectPromise;
      expect(peerId).toBe('test-peer-id');
      expect(P2PService.peer).not.toBeNull();
    });

    test('should handle connection errors', async () => {
      const connectPromise = P2PService.connect('test-peer-id');
      
      // Simulate error
      setTimeout(() => {
        P2PService.peer._simulateError({
          type: 'unavailable-id',
          message: 'ID is taken'
        });
      }, 10);
      
      await expect(connectPromise).rejects.toEqual({
        type: 'unavailable-id',
        message: 'ID is taken'
      });
    });

    test('should set up event handlers correctly', async () => {
      const connectPromise = P2PService.connect('test-peer-id');
      
      expect(P2PService.peer._handlers.open).toBeDefined();
      expect(P2PService.peer._handlers.connection).toBeDefined();
      expect(P2PService.peer._handlers.error).toBeDefined();
      
      P2PService.peer._simulateOpen();
      await connectPromise;
    });
  });

  describe('addConnection()', () => {
    beforeEach(async () => {
      const connectPromise = P2PService.connect('my-peer-id');
      P2PService.peer._simulateOpen();
      await connectPromise;
    });

    test('should add a new connection', () => {
      const mockConn = {
        peer: 'other-peer',
        open: true,
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn);
      
      expect(P2PService.connections.length).toBe(1);
      expect(P2PService.connections[0].peer).toBe('other-peer');
    });

    test('should not add duplicate connections', () => {
      const mockConn = {
        peer: 'other-peer',
        open: true,
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn);
      P2PService.addConnection(mockConn);
      
      expect(P2PService.connections.length).toBe(1);
    });

    test('should call onConnectionChange callback', () => {
      const callback = jest.fn();
      P2PService.setOnConnectionChange(callback);

      const mockConn = {
        peer: 'other-peer',
        open: true,
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn);
      
      expect(callback).toHaveBeenCalledWith(1);
    });

    test('should handle connection close event', () => {
      const callback = jest.fn();
      P2PService.setOnConnectionChange(callback);

      const mockConn = {
        peer: 'other-peer',
        open: true,
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn);
      expect(P2PService.connections.length).toBe(1);
      
      // Simulate close
      mockConn._handlers.close();
      
      expect(P2PService.connections.length).toBe(0);
      expect(callback).toHaveBeenCalledWith(0);
    });
  });

  describe('connectToPeer()', () => {
    beforeEach(async () => {
      const connectPromise = P2PService.connect('my-peer-id');
      P2PService.peer._simulateOpen();
      await connectPromise;
    });

    test('should connect to another peer', () => {
      P2PService.connectToPeer('target-peer-id');
      
      expect(P2PService.connections.length).toBe(1);
      expect(P2PService.connections[0].peer).toBe('target-peer-id');
    });

    test('should not connect to self', () => {
      P2PService.connectToPeer('my-peer-id');
      
      expect(P2PService.connections.length).toBe(0);
    });

    test('should not duplicate existing connections', () => {
      P2PService.connectToPeer('target-peer-id');
      P2PService.connectToPeer('target-peer-id');
      
      expect(P2PService.connections.length).toBe(1);
    });
  });

  describe('broadcast()', () => {
    beforeEach(async () => {
      const connectPromise = P2PService.connect('my-peer-id');
      P2PService.peer._simulateOpen();
      await connectPromise;
    });

    test('should broadcast to all open connections', () => {
      const mockConn1 = {
        peer: 'peer-1',
        open: true,
        send: jest.fn(),
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      const mockConn2 = {
        peer: 'peer-2',
        open: true,
        send: jest.fn(),
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn1);
      P2PService.addConnection(mockConn2);

      const testData = { type: 'TEST', message: 'hello' };
      P2PService.broadcast(testData);

      expect(mockConn1.send).toHaveBeenCalled();
      expect(mockConn2.send).toHaveBeenCalled();
    });

    test('should not broadcast to closed connections', () => {
      const mockConn = {
        peer: 'peer-1',
        open: false,
        send: jest.fn(),
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn);
      P2PService.broadcast({ type: 'TEST' });

      expect(mockConn.send).not.toHaveBeenCalled();
    });

    test('should add metadata to messages', () => {
      const mockConn = {
        peer: 'peer-1',
        open: true,
        send: jest.fn(),
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn);
      P2PService.broadcast({ type: 'TEST' });

      const sentMessage = mockConn.send.mock.calls[0][0];
      expect(sentMessage._id).toBeDefined();
      expect(sentMessage._timestamp).toBeDefined();
      expect(sentMessage.type).toBe('TEST');
    });
  });

  describe('relay()', () => {
    beforeEach(async () => {
      const connectPromise = P2PService.connect('my-peer-id');
      P2PService.peer._simulateOpen();
      await connectPromise;
    });

    test('should relay messages to other peers except source', () => {
      const mockConn1 = {
        peer: 'peer-1',
        open: true,
        send: jest.fn(),
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      const mockConn2 = {
        peer: 'peer-2',
        open: true,
        send: jest.fn(),
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn1);
      P2PService.addConnection(mockConn2);

      const testData = { _id: 'msg-123', type: 'TEST' };
      P2PService.relay(testData, 'peer-1');

      expect(mockConn1.send).not.toHaveBeenCalled();
      expect(mockConn2.send).toHaveBeenCalledWith(testData);
    });

    test('should not relay duplicate messages', () => {
      const mockConn = {
        peer: 'peer-1',
        open: true,
        send: jest.fn(),
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn);

      const testData = { _id: 'msg-123', type: 'TEST' };
      P2PService.relay(testData, 'peer-2');
      P2PService.relay(testData, 'peer-2');

      expect(mockConn.send).toHaveBeenCalledTimes(1);
    });

    test('should clean up old seen messages', () => {
      // Add 1001 messages to trigger cleanup
      for (let i = 0; i < 1001; i++) {
        P2PService.relay({ _id: `msg-${i}` }, 'source-peer');
      }

      const seenKeys = Object.keys(P2PService.seenMessages);
      expect(seenKeys.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      const connectPromise = P2PService.connect('my-peer-id');
      P2PService.peer._simulateOpen();
      await connectPromise;
    });

    test('should trigger onMessageReceived callback', () => {
      const callback = jest.fn();
      P2PService.setOnMessageReceived(callback);

      const mockConn = {
        peer: 'peer-1',
        open: true,
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn);

      const testData = { _id: 'msg-123', type: 'TEST', message: 'hello' };
      mockConn._handlers.data(testData);

      expect(callback).toHaveBeenCalledWith(testData);
    });

    test('should relay received messages', () => {
      const mockConn1 = {
        peer: 'peer-1',
        open: true,
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      const mockConn2 = {
        peer: 'peer-2',
        open: true,
        send: jest.fn(),
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn1);
      P2PService.addConnection(mockConn2);

      const testData = { _id: 'msg-123', type: 'TEST' };
      mockConn1._handlers.data(testData);

      expect(mockConn2.send).toHaveBeenCalledWith(testData);
    });
  });

  describe('getConnectionCount()', () => {
    beforeEach(async () => {
      const connectPromise = P2PService.connect('my-peer-id');
      P2PService.peer._simulateOpen();
      await connectPromise;
    });

    test('should return correct connection count', () => {
      expect(P2PService.getConnectionCount()).toBe(0);

      const mockConn1 = {
        peer: 'peer-1',
        open: true,
        _handlers: {},
        on: function(event, handler) {
          this._handlers[event] = handler;
        }
      };

      P2PService.addConnection(mockConn1);
      expect(P2PService.getConnectionCount()).toBe(1);
    });
  });
});