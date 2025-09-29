# YikYak Clone - Decentralized Anonymous Local Chat

A modern, peer-to-peer YikYak clone that provides anonymous, location-based communication without a central server. Built with React and PeerJS for a truly decentralized experience.

## 🌟 Features

- **🔒 Decentralized P2P Architecture**: No central server - messages are shared directly between peers
- **📍 Location-Based Zones**: Automatic grouping by geographic area using geolocation
- **👤 Anonymous Posting**: No signup required, completely anonymous
- **⬆️⬇️ Voting System**: Upvote and downvote posts with real-time P2P synchronization
- **🕸️ Mesh Network**: Messages propagate through the network for better reach
- **💾 Local Persistence**: Posts cached locally and expire after 24 hours
- **🎨 Modern UI**: Beautiful, responsive design with smooth animations
- **🚀 Easy Signup**: No account creation needed - just open and start posting

## 🛠️ Technology Stack

- **Frontend**: React 19.1.1
- **Styling**: Styled Components
- **P2P Networking**: PeerJS 1.5.5
- **Location Services**: Browser Geolocation API
- **Storage**: LocalStorage for persistence

## 📦 Installation

```bash
cd client
npm install
```

## 🚀 Running the App

```bash
cd client
npm start
```

The app will open at `http://localhost:3000`

## 🔧 How It Works

### P2P Architecture
- Each user connects via PeerJS to form a mesh network
- The first user in a geographic zone becomes the "host"
- Other users connect as clients and link to the host
- Messages propagate through the network to reach all users

### Location Zones
- Geographic coordinates are truncated to create zones (~1.1km area)
- Zones are combined with the current date for daily rotation
- Users in the same zone can see each other's posts

### Anonymity & Privacy
- No user registration or login required
- No data stored on central servers
- Posts are identified by temporary peer IDs
- All communication is peer-to-peer

### Data Persistence
- Posts cached in browser's LocalStorage
- Automatic expiration after 24 hours
- Votes and scores synchronized across peers

## 🎮 Usage

1. **First Visit**: A welcome screen explains the app features
2. **Location Permission**: Grant location access to join your local zone
3. **Post a Yak**: Type your message (up to 200 characters) and hit "Post Yak"
4. **Vote**: Upvote (▲) or downvote (▼) posts you see
5. **Real-time Sync**: All actions sync automatically with other peers

## 🔐 Privacy & Security

- **No Central Database**: All data is peer-to-peer
- **Anonymous by Design**: No personal information collected
- **Local Storage Only**: Data stored only on your device
- **24-Hour Expiry**: Posts automatically expire
- **Distributed Architecture**: Resistant to single points of failure

## 🎯 Key Features Explained

### Voting System
- Click upvote (▲) to increase score
- Click downvote (▼) to decrease score
- Click again to remove your vote
- Scores sync across all connected peers
- Visual feedback shows your active vote

### Mesh Networking
- Messages relay through multiple peers
- Deduplication prevents message loops
- Improves reliability and reach
- No single point of failure

### Location Zones
- Automatic zone detection
- Daily zone rotation for fresh content
- Fallback zone if location is denied
- ~1.1km geographic precision

## 🛡️ Resistance Features

- **Decentralized**: No central server to shut down
- **P2P Mesh Network**: Messages propagate through multiple paths
- **Anonymous**: No user accounts or tracking
- **Local-First**: Works even with limited connectivity
- **Public PeerJS Server**: Uses free infrastructure (can be self-hosted)

## 🔮 Future Enhancements

Potential improvements:
- Comments/replies on posts
- User profile avatars (anonymous)
- Post reporting/moderation
- Self-hosted PeerJS server option
- PWA support for mobile
- End-to-end encryption
- Multi-peer discovery

## ⚠️ Important Notes

- The app works best with multiple users in the same zone
- Requires browser support for Geolocation API
- Uses the public PeerJS cloud server (consider hosting your own for production)
- Connection quality depends on network conditions

## 🤝 Contributing

This is an open-source educational project. Feel free to fork and improve!

## 📄 License

MIT License - Feel free to use and modify as needed.

## 🙏 Acknowledgments

- Inspired by the original YikYak app
- Built with PeerJS for P2P networking
- Uses React and Styled Components for modern UI

---

**Remember**: Use this app responsibly and be respectful to others in your community!