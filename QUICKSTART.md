# Quick Start Guide

Get your YikYak Clone up and running in 2 minutes!

## 🎯 Prerequisites

- Node.js 14+ installed ([Download here](https://nodejs.org/))
- A modern web browser (Chrome, Firefox, Safari, Edge)

## 🚀 3 Steps to Run

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Start the App

```bash
npm start
```

The app will automatically open at `http://localhost:3000`

### 3. Allow Location Access

When prompted, click "Allow" to enable location services. This lets you connect with users in your area.

**That's it!** You're ready to start yakking! 🎉

## 📱 Testing P2P Features

To test the peer-to-peer functionality:

1. **Open Multiple Windows**: Open 2-3 browser windows/tabs at `http://localhost:3000`
2. **Allow Location**: Grant location permission in all windows
3. **Post a Yak**: Type a message in one window and post it
4. **Watch it Sync**: The message should appear in all other windows instantly!
5. **Test Voting**: Upvote/downvote from different windows and see the scores sync

## 🎮 First Time User?

When you first open the app, you'll see a welcome screen explaining:
- How the P2P system works
- Privacy features
- How to use the app

Click "Get Started" to begin!

## 🌟 Key Features to Try

### Post a Yak
1. Type your message (max 200 characters)
2. Click "Post Yak" or press Ctrl+Enter
3. Your yak appears at the top of the feed

### Vote on Yaks
- Click ▲ to upvote (turns green)
- Click ▼ to downvote (turns green)
- Click again to remove your vote
- Scores update in real-time across all peers

### Watch the Connection Status
- Top bar shows connection status
- Green badge shows number of connected peers
- Status messages explain what's happening

## 🔧 Troubleshooting

### "No peers connected"
This is normal when testing alone! The app works best with multiple users:
- Open multiple browser windows
- Share with friends on your network
- Or deploy it and share the URL

### Location Permission Denied
If you deny location access:
- The app still works!
- You'll be in a "denied" zone with others who denied permission
- To change: Click the lock icon in your browser's address bar

### Build Errors
```bash
# Clear everything and start fresh
cd client
rm -rf node_modules package-lock.json
npm install
npm start
```

## 🎨 Customization Ideas

Want to make it your own? Here are easy customizations:

### Change Colors
Edit `client/src/components/Header.js`:
```javascript
background: linear-gradient(135deg, #YOUR_COLOR 0%, #YOUR_COLOR2 100%);
```

### Change App Name
Edit `client/src/components/Header.js`:
```javascript
<Title>Your App Name</Title>
```

### Change Character Limit
Edit `client/src/components/YakForm.js`:
```javascript
const MAX_LENGTH = 300; // Change from 200
```

### Change Zone Size
Edit `client/src/services/location.js`:
```javascript
// Make zones larger (1 decimal = ~11km)
const latZone = Math.floor(latitude * 10);
const lonZone = Math.floor(longitude * 10);
```

## 📚 Learn More

- **Full Documentation**: See [README.md](./README.md)
- **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **React Docs**: [reactjs.org](https://reactjs.org)
- **PeerJS Docs**: [peerjs.com](https://peerjs.com)

## 💡 Tips for Best Experience

1. **Use HTTPS in Production**: Required for geolocation on deployed sites
2. **Test with Multiple Devices**: The more peers, the better!
3. **Modern Browsers**: Works best on latest Chrome, Firefox, Safari, Edge
4. **Good Network**: P2P works better on stable connections
5. **Allow Location**: For the best local experience

## 🎉 Have Fun!

Now go ahead and:
- Post your first yak
- Test the voting system
- Try it with friends
- Deploy it to the web
- Customize it to your liking!

Questions? Check the README.md or create an issue on GitHub!

---

**Built with ❤️ using React and PeerJS**