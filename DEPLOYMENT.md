# Deployment Guide

This guide will help you deploy your YikYak Clone to various platforms.

## 🚀 Quick Deploy Options

### Option 1: Static Hosting (Recommended)

The app is a static React application that can be deployed to any static hosting service.

#### Netlify (Easiest)

1. Build the app:
```bash
cd client
npm run build
```

2. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

3. Deploy:
```bash
netlify deploy --prod --dir=build
```

Or simply drag and drop the `build` folder to [Netlify Drop](https://app.netlify.com/drop)

#### Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy from the client directory:
```bash
cd client
vercel --prod
```

#### GitHub Pages

1. Add to `client/package.json`:
```json
"homepage": "https://yourusername.github.io/yikyak-clone"
```

2. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

3. Add scripts to `package.json`:
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d build"
```

4. Deploy:
```bash
npm run deploy
```

### Option 2: Docker

Create a `Dockerfile` in the client directory:

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t yikyak-clone .
docker run -p 80:80 yikyak-clone
```

### Option 3: Self-Hosted with Nginx

1. Build the app:
```bash
cd client
npm run build
```

2. Copy the build folder to your server:
```bash
scp -r build/ user@yourserver:/var/www/yikyak
```

3. Configure Nginx:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/yikyak;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🔧 Configuration Options

### Custom PeerJS Server (Recommended for Production)

By default, the app uses the public PeerJS cloud server. For production, you should host your own:

1. Install PeerJS Server:
```bash
npm install -g peer
```

2. Run the server:
```bash
peerjs --port 9000 --key peerjs --path /myapp
```

3. Update `client/src/services/P2PService.js`:
```javascript
this.peer = new Peer(peerId, {
  host: 'your-server.com',
  port: 9000,
  path: '/myapp',
  secure: true // if using HTTPS
});
```

### HTTPS Requirement

Modern browsers require HTTPS for:
- Geolocation API
- Service Workers (PWA features)

Make sure your deployment uses HTTPS. Most hosting providers (Netlify, Vercel, etc.) provide this automatically.

## 📱 Progressive Web App (PWA)

The app is already configured as a PWA. To enable offline support:

1. Update `client/src/index.js` to register the service worker:
```javascript
// Change from:
serviceWorkerRegistration.unregister();
// To:
serviceWorkerRegistration.register();
```

2. Rebuild and deploy

## 🌐 Environment Variables

If you want to configure the app with environment variables:

Create `.env` in the client directory:
```
REACT_APP_PEER_HOST=your-peer-server.com
REACT_APP_PEER_PORT=9000
REACT_APP_PEER_PATH=/myapp
```

## 🧪 Testing Locally

To test the production build locally:

```bash
cd client
npm run build
npx serve -s build
```

Open multiple browser tabs/windows to test the P2P functionality.

## 📊 Monitoring & Analytics

Consider adding analytics to track usage:

1. Google Analytics
2. Plausible (privacy-friendly)
3. Matomo (self-hosted)

Add the tracking script to `client/public/index.html`

## 🔒 Security Considerations

1. **Rate Limiting**: Consider adding rate limiting to prevent spam
2. **Content Moderation**: Implement a reporting system
3. **CORS**: Configure properly if using a custom PeerJS server
4. **Privacy**: Ensure HTTPS everywhere to protect user privacy

## 🚨 Troubleshooting

### Location Permission Issues
- Ensure HTTPS is enabled
- Check browser console for errors
- Test with location services enabled

### P2P Connection Problems
- Verify PeerJS server is accessible
- Check firewall settings
- Test on different networks

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📈 Scaling

For larger deployments:

1. Host your own PeerJS server cluster
2. Implement geographic load balancing
3. Add CDN for static assets
4. Consider adding a lightweight backend for moderation

## 💡 Tips

- Test with multiple devices/browsers
- Monitor PeerJS server performance
- Keep dependencies updated
- Consider adding crash reporting (Sentry)

---

Need help? Check the main README.md or create an issue!