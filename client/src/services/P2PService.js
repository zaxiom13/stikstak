import Peer from 'peerjs';

class P2PService {
  constructor() {
    this.peer = null;
    this.connections = [];
    this.onMessageReceived = () => {};
    this.onConnectionChange = () => {};
    this.connectionTimeout = 10000; // 10 seconds
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  connect(peerId) {
    return new Promise((resolve, reject) => {
      try {
        // Validate peer ID format (PeerJS requirements)
        if (peerId) {
          // PeerJS doesn't allow consecutive dashes, spaces, or certain special chars
          if (/--/.test(peerId) || /\s/.test(peerId)) {
            const error = new Error(`Invalid peer ID format: "${peerId}". Cannot contain consecutive dashes or spaces.`);
            console.error('Peer ID validation failed:', error);
            reject(error);
            return;
          }
        }

        const config = {
          // For simplicity, we'll use the public PeerJS server.
          // In a real application, you would host your own.
          debug: 2, // Enable debugging
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        };

        this.peer = new Peer(peerId, config);

        // Set a timeout for connection
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout - could not initialize P2P'));
        }, this.connectionTimeout);

        this.peer.on('open', (id) => {
          clearTimeout(timeout);
          console.log('My peer ID is: ' + id);
          this.reconnectAttempts = 0; // Reset on successful connection
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          console.log('Incoming connection from: ' + conn.peer);
          this.setupConnection(conn);
        });

        this.peer.on('disconnected', () => {
          console.warn('Peer disconnected, attempting to reconnect...');
          this.handleDisconnection();
        });

        this.peer.on('close', () => {
          console.warn('Peer connection closed');
          this.handleClose();
        });

        this.peer.on('error', (err) => {
          clearTimeout(timeout);
          console.error('PeerJS error:', err);
          this.handleError(err);
          reject(err);
        });
      } catch (error) {
        console.error('Failed to create peer:', error);
        reject(error);
      }
    });
  }

  handleDisconnection() {
    if (this.peer && !this.peer.destroyed && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        try {
          this.peer.reconnect();
        } catch (error) {
          console.error('Reconnection failed:', error);
        }
      }, 1000 * this.reconnectAttempts); // Exponential backoff
    }
  }

  handleClose() {
    this.connections.forEach(conn => {
      try {
        if (conn.open) {
          conn.close();
        }
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    });
    this.connections = [];
    this.onConnectionChange(0);
  }

  handleError(err) {
    // Handle specific error types
    switch (err.type) {
      case 'peer-unavailable':
        console.warn('Peer unavailable:', err);
        break;
      case 'network':
        console.error('Network error:', err);
        this.handleDisconnection();
        break;
      case 'server-error':
        console.error('Server error:', err);
        break;
      case 'socket-error':
        console.error('Socket error:', err);
        break;
      case 'unavailable-id':
        // This is expected when trying to become host but ID is taken
        console.log('Peer ID already in use');
        break;
      default:
        console.error('Unknown error:', err);
    }
  }

  setupConnection(conn) {
    // Wait for connection to fully open before adding
    conn.on('open', () => {
      console.log('Connection opened with: ' + conn.peer);
      this.addConnection(conn);
    });

    conn.on('error', (err) => {
      console.error('Connection error with ' + conn.peer + ':', err);
      this.removeConnection(conn.peer);
    });
  }

  addConnection(conn) {
    if (!conn || !conn.peer) {
      console.error('Invalid connection object');
      return;
    }

    // Check if already connected
    if (this.connections.find(c => c.peer === conn.peer)) {
      console.log(`Already connected to ${conn.peer}`);
      return;
    }

    console.log(`Adding connection to ${conn.peer}`);
    this.connections.push(conn);
    this.onConnectionChange(this.connections.length);

    conn.on('data', (data) => {
      try {
        console.log('Received data from ' + conn.peer + ':', data);
        this.onMessageReceived(data);
        
        // Relay the message to other peers (mesh network)
        this.relay(data, conn.peer);
      } catch (error) {
        console.error('Error handling received data:', error);
      }
    });

    conn.on('close', () => {
      console.log('Connection closed with: ' + conn.peer);
      this.removeConnection(conn.peer);
    });

    conn.on('error', (err) => {
      console.error('Connection error with ' + conn.peer + ':', err);
      this.removeConnection(conn.peer);
    });
  }

  removeConnection(peerId) {
    const prevLength = this.connections.length;
    this.connections = this.connections.filter(c => c.peer !== peerId);
    
    if (this.connections.length !== prevLength) {
      console.log(`Removed connection to ${peerId}`);
      this.onConnectionChange(this.connections.length);
    }
  }

  connectToPeer(peerId) {
    if (!this.peer || this.peer.destroyed) {
      console.error('Peer not initialized or destroyed');
      return;
    }

    if (this.peer.id === peerId) {
      console.log('Cannot connect to self');
      return;
    }

    if (this.connections.find(c => c.peer === peerId)) {
      console.log(`Already connected to ${peerId}`);
      return;
    }

    console.log(`Attempting to connect to peer: ${peerId}`);
    
    try {
      const conn = this.peer.connect(peerId, {
        reliable: true,
        serialization: 'json'
      });

      if (!conn) {
        console.error('Failed to create connection');
        return;
      }

      // Setup connection with proper event handlers
      this.setupConnection(conn);

      // Set a timeout for connection
      const timeout = setTimeout(() => {
        if (!conn.open) {
          console.error(`Connection to ${peerId} timed out`);
          this.removeConnection(peerId);
        }
      }, this.connectionTimeout);

      conn.on('open', () => {
        clearTimeout(timeout);
      });

    } catch (error) {
      console.error('Error connecting to peer:', error);
    }
  }

  broadcast(data) {
    if (!this.peer || this.peer.destroyed) {
      console.error('Cannot broadcast - peer not initialized');
      return;
    }

    if (this.connections.length === 0) {
      console.warn('No peers connected - message will not be sent');
      return;
    }

    console.log('Broadcasting data to ' + this.connections.length + ' peer(s)');
    
    // Add timestamp and message ID to prevent loops
    const message = {
      ...data,
      _id: `${this.peer.id}-${Date.now()}-${Math.random()}`,
      _timestamp: Date.now()
    };
    
    let successCount = 0;
    this.connections.forEach(conn => {
      try {
        if (conn.open) {
          conn.send(message);
          successCount++;
        } else {
          console.warn(`Connection to ${conn.peer} is not open`);
        }
      } catch (error) {
        console.error(`Error sending to ${conn.peer}:`, error);
        this.removeConnection(conn.peer);
      }
    });
    
    console.log(`Broadcast sent to ${successCount} peer(s)`);
  }

  relay(data, sourcePeer) {
    if (!data || !data._id) {
      console.warn('Cannot relay message without _id');
      return;
    }

    // Relay messages to other peers (except the source)
    // This creates a mesh network where messages propagate
    const seenKey = `seen_${data._id}`;
    
    // Check if we've already seen this message
    if (this.seenMessages && this.seenMessages[seenKey]) {
      console.log('Message already seen, skipping relay');
      return;
    }
    
    // Mark message as seen
    if (!this.seenMessages) {
      this.seenMessages = {};
    }
    this.seenMessages[seenKey] = true;
    
    // Clean up old seen messages (keep last 1000)
    const seenKeys = Object.keys(this.seenMessages);
    if (seenKeys.length > 1000) {
      const toRemove = seenKeys.slice(0, seenKeys.length - 1000);
      toRemove.forEach(key => delete this.seenMessages[key]);
    }
    
    // Relay to other peers
    let relayCount = 0;
    this.connections.forEach(conn => {
      try {
        if (conn.open && conn.peer !== sourcePeer) {
          conn.send(data);
          relayCount++;
        }
      } catch (error) {
        console.error(`Error relaying to ${conn.peer}:`, error);
        this.removeConnection(conn.peer);
      }
    });
    
    if (relayCount > 0) {
      console.log(`Relayed message to ${relayCount} peer(s)`);
    }
  }

  setOnMessageReceived(callback) {
    this.onMessageReceived = callback;
  }

  setOnConnectionChange(callback) {
    this.onConnectionChange = callback;
  }

  getConnectionCount() {
    return this.connections.filter(c => c.open).length;
  }

  getPeerId() {
    return this.peer ? this.peer.id : null;
  }

  isConnected() {
    return this.peer && !this.peer.destroyed && !this.peer.disconnected;
  }

  destroy() {
    console.log('Destroying P2P service');
    
    // Close all connections
    this.connections.forEach(conn => {
      try {
        if (conn.open) {
          conn.close();
        }
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    });
    this.connections = [];
    
    // Destroy peer
    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.destroy();
      } catch (error) {
        console.error('Error destroying peer:', error);
      }
    }
    this.peer = null;
    
    this.onConnectionChange(0);
  }
}

const p2pServiceInstance = new P2PService();
export default p2pServiceInstance;
