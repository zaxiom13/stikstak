import Peer from 'peerjs';

class P2PService {
  constructor() {
    this.peer = null;
    this.connections = [];
    this.onMessageReceived = () => {};
    this.onConnectionChange = () => {};
  }

  connect(peerId) {
    return new Promise((resolve, reject) => {
      this.peer = new Peer(peerId, {
        // For simplicity, we'll use the public PeerJS server.
        // In a real application, you would host your own.
      });

      this.peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        console.log('Connected to: ' + conn.peer);
        this.addConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        reject(err);
      });
    });
  }

  addConnection(conn) {
    if (!this.connections.find(c => c.peer === conn.peer)) {
      this.connections.push(conn);
      this.onConnectionChange(this.connections.length);

      conn.on('data', (data) => {
        console.log('Received data:', data);
        this.onMessageReceived(data);
        
        // Relay the message to other peers (mesh network)
        this.relay(data, conn.peer);
      });

      conn.on('close', () => {
        console.log('Connection closed with: ' + conn.peer);
        this.connections = this.connections.filter(c => c.peer !== conn.peer);
        this.onConnectionChange(this.connections.length);
      });
    }
  }

  connectToPeer(peerId) {
    if (this.peer.id === peerId) return; // Don't connect to self

    if (this.connections.find(c => c.peer === peerId)) {
      console.log(`Already connected to ${peerId}`);
      return;
    }

    console.log(`Connecting to peer: ${peerId}`);
    const conn = this.peer.connect(peerId);
    this.addConnection(conn);
  }

  broadcast(data) {
    console.log('Broadcasting data:', data);
    // Add timestamp and message ID to prevent loops
    const message = {
      ...data,
      _id: `${this.peer.id}-${Date.now()}-${Math.random()}`,
      _timestamp: Date.now()
    };
    
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }

  relay(data, sourcePeer) {
    // Relay messages to other peers (except the source)
    // This creates a mesh network where messages propagate
    const seenKey = `seen_${data._id}`;
    
    // Check if we've already seen this message
    if (this.seenMessages && this.seenMessages[seenKey]) {
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
    this.connections.forEach(conn => {
      if (conn.open && conn.peer !== sourcePeer) {
        conn.send(data);
      }
    });
  }

  setOnMessageReceived(callback) {
    this.onMessageReceived = callback;
  }

  setOnConnectionChange(callback) {
    this.onConnectionChange = callback;
  }

  getConnectionCount() {
    return this.connections.length;
  }
}

const p2pServiceInstance = new P2PService();
export default p2pServiceInstance;
