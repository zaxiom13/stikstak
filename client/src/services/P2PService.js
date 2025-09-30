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
    this.locationCode = null;
    this.messageCache = new Map(); // For deduplication
    this.publishInterval = null;
    this.fetchInterval = null;
    this.syncIntervalTime = 5000; // 5 seconds
  }

  setLocationCode(locationCode) {
    this.locationCode = locationCode;
    console.log(`Location code set to: ${locationCode}`);
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
        
        // Deduplicate: Check if message already cached
        if (data._id && this.isMessageCached(data._id)) {
          console.log('Duplicate message received, ignoring:', data._id);
          return;
        }
        
        // Cache the message
        if (data._id) {
          this.cacheMessage(data);
        }
        
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
    
    // Add timestamp, message ID, and location code to prevent loops and ensure location tracking
    const message = {
      ...data,
      _id: `${this.peer.id}-${Date.now()}-${Math.random()}`,
      _timestamp: Date.now(),
      _locationCode: this.locationCode
    };
    
    // Cache message for deduplication
    this.cacheMessage(message);
    
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
    return message;
  }

  cacheMessage(message) {
    if (!message._id) return;
    
    // Cache message for deduplication
    this.messageCache.set(message._id, {
      message,
      timestamp: Date.now()
    });
    
    // Clean up old cached messages (keep last 24 hours)
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [id, cached] of this.messageCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.messageCache.delete(id);
      }
    }
    
    // Limit cache size (keep last 1000 messages)
    if (this.messageCache.size > 1000) {
      const entries = Array.from(this.messageCache.entries());
      const toRemove = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, entries.length - 1000);
      toRemove.forEach(([id]) => this.messageCache.delete(id));
    }
  }

  isMessageCached(messageId) {
    return this.messageCache.has(messageId);
  }

  relay(data, sourcePeer) {
    if (!data || !data._id) {
      console.warn('Cannot relay message without _id');
      return;
    }

    // Check if we've already seen this message using the message cache
    if (this.isMessageCached(data._id)) {
      console.log('Message already seen (cached), skipping relay');
      return;
    }
    
    // Cache the message
    this.cacheMessage(data);
    
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

  startPeriodicSync(publishCallback, fetchCallback) {
    console.log(`Starting periodic sync every ${this.syncIntervalTime}ms`);
    
    // Stop any existing intervals
    this.stopPeriodicSync();
    
    // Periodic publish: Send out our messages to ensure all peers have them
    this.publishInterval = setInterval(() => {
      if (this.connections.length > 0) {
        console.log('[Periodic Sync] Publishing messages...');
        if (publishCallback) {
          publishCallback();
        }
      }
    }, this.syncIntervalTime);
    
    // Periodic fetch: Request messages from peers
    this.fetchInterval = setInterval(() => {
      if (this.connections.length > 0) {
        console.log('[Periodic Sync] Requesting messages from peers...');
        this.requestMessagesFromPeers();
        if (fetchCallback) {
          fetchCallback();
        }
      }
    }, this.syncIntervalTime);
  }

  stopPeriodicSync() {
    if (this.publishInterval) {
      clearInterval(this.publishInterval);
      this.publishInterval = null;
    }
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
    console.log('Stopped periodic sync');
  }

  requestMessagesFromPeers() {
    // Send a request for all messages to all peers
    const request = {
      type: 'REQUEST_MESSAGES',
      _id: `${this.peer?.id || 'unknown'}-${Date.now()}-${Math.random()}`,
      _timestamp: Date.now(),
      _locationCode: this.locationCode
    };
    
    this.connections.forEach(conn => {
      try {
        if (conn.open) {
          conn.send(request);
        }
      } catch (error) {
        console.error(`Error requesting messages from ${conn.peer}:`, error);
      }
    });
  }

  getAllCachedMessages() {
    return Array.from(this.messageCache.values()).map(cached => cached.message);
  }

  destroy() {
    console.log('Destroying P2P service');
    
    // Stop periodic sync
    this.stopPeriodicSync();
    
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
