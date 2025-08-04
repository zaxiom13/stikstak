import Peer from 'peerjs';

class P2PService {
  constructor() {
    this.peer = null;
    this.connections = [];
    this.onMessageReceived = () => {};
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

      conn.on('data', (data) => {
        console.log('Received data:', data);
        this.onMessageReceived(data);
      });

      conn.on('close', () => {
        console.log('Connection closed with: ' + conn.peer);
        this.connections = this.connections.filter(c => c.peer !== conn.peer);
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
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(data);
      }
    });
  }

  setOnMessageReceived(callback) {
    this.onMessageReceived = callback;
  }
}

export default new P2PService();
