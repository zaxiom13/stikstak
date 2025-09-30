# Location Code and Periodic Sync Implementation

## Summary

This implementation adds comprehensive message location tracking, periodic publishing/fetching, and deduplication to the YikYak P2P messaging system.

## Features Implemented

### 1. Location Code on All Messages

All messages now include a `_locationCode` field that tracks which geographic zone they originated from:

```javascript
const message = {
  ...data,
  _id: `${this.peer.id}-${Date.now()}-${Math.random()}`,
  _timestamp: Date.now(),
  _locationCode: this.locationCode  // Added location tracking
};
```

**Files Modified:**
- `client/src/services/P2PService.js` - Added `setLocationCode()` method and location code to all broadcasts
- `client/src/App.js` - Calls `P2PService.setLocationCode(locationCode)` after retrieving location

### 2. Periodic Message Publishing

The system now periodically publishes all messages to ensure all peers have a consistent view:

**Implementation:**
- Configurable interval (default: 5 seconds)
- Publishes all yaks in bulk via `SYNC_MESSAGES` message type
- Only publishes when peers are connected
- Stops when service is destroyed

**Code:**
```javascript
P2PService.startPeriodicSync(
  // Publish callback: periodically send all our yaks
  () => {
    if (currentYaks.length > 0) {
      P2PService.broadcast({
        type: 'SYNC_MESSAGES',
        payload: { yaks: currentYaks }
      });
    }
  },
  null // Fetch callback handled separately
);
```

### 3. Periodic Message Fetching

Clients periodically request messages from peers to ensure they have all messages:

**Implementation:**
- Same configurable interval as publishing (5 seconds)
- Sends `REQUEST_MESSAGES` to all connected peers
- Peers respond by broadcasting all their messages
- Automatic message deduplication prevents duplicates

**Code:**
```javascript
requestMessagesFromPeers() {
  const request = {
    type: 'REQUEST_MESSAGES',
    _id: `${this.peer?.id || 'unknown'}-${Date.now()}-${Math.random()}`,
    _timestamp: Date.now(),
    _locationCode: this.locationCode
  };
  
  this.connections.forEach(conn => {
    if (conn.open) {
      conn.send(request);
    }
  });
}
```

### 4. Comprehensive Deduplication

Multiple layers of deduplication ensure messages are only processed once:

**Deduplication Layers:**

1. **Message Cache (Map-based):**
   - All messages stored in `messageCache` with `_id` as key
   - Checked before processing any incoming message
   - Automatically cleans up old messages (24-hour TTL, max 1000 messages)

2. **Receive-time Deduplication:**
   ```javascript
   conn.on('data', (data) => {
     // Check if message already cached
     if (data._id && this.isMessageCached(data._id)) {
       console.log('Duplicate message received, ignoring:', data._id);
       return;
     }
     
     // Cache the message
     if (data._id) {
       this.cacheMessage(data);
     }
     
     this.onMessageReceived(data);
   });
   ```

3. **Application-level Deduplication:**
   ```javascript
   if (data.type === 'NEW_YAK') {
     setYaks(prevYaks => {
       // Deduplicate by checking if yak already exists
       if (prevYaks.find(y => y.id === data.payload.id)) {
         console.log('Duplicate yak received, ignoring:', data.payload.id);
         return prevYaks;
       }
       return [data.payload, ...prevYaks];
     });
   }
   ```

4. **Relay Deduplication:**
   - Messages are only relayed once using the message cache
   - Prevents infinite relay loops in mesh network

### 5. New Message Types

**REQUEST_MESSAGES:**
- Type: Request
- Purpose: Ask peers to send all their messages
- Sent periodically to all connected peers

**SYNC_MESSAGES:**
- Type: Bulk data
- Purpose: Send all messages at once
- Payload: `{ yaks: [...] }`
- Sent in response to REQUEST_MESSAGES or periodically

## Key Methods Added/Modified

### P2PService.js

1. **`setLocationCode(locationCode)`**
   - Sets the location code for this peer
   - All subsequent messages include this location code

2. **`cacheMessage(message)`**
   - Adds message to cache for deduplication
   - Automatically cleans up old messages

3. **`isMessageCached(messageId)`**
   - Checks if a message has been seen before
   - Returns boolean

4. **`startPeriodicSync(publishCallback, fetchCallback)`**
   - Starts periodic intervals for publish and fetch
   - Configurable interval (default 5000ms)

5. **`stopPeriodicSync()`**
   - Stops all periodic sync intervals
   - Called automatically on destroy

6. **`requestMessagesFromPeers()`**
   - Sends REQUEST_MESSAGES to all connected peers
   - Called periodically by fetch interval

7. **`getAllCachedMessages()`**
   - Returns all messages from cache
   - Useful for debugging and testing

### App.js

1. **Enhanced Message Handler:**
   - Handles REQUEST_MESSAGES
   - Handles SYNC_MESSAGES with bulk deduplication
   - Improved NEW_YAK deduplication logging

2. **Automatic Sync Startup:**
   - Starts periodic sync when host connection succeeds
   - Starts periodic sync when client connection succeeds
   - Different callbacks for host vs client if needed

## Configuration

```javascript
// In P2PService constructor
this.syncIntervalTime = 5000; // 5 seconds - adjust as needed
```

## Benefits

1. **Consistency:** All peers eventually have all messages
2. **Reliability:** Missing messages are automatically fetched
3. **Efficiency:** Deduplication prevents wasted bandwidth and storage
4. **Scalability:** Mesh network with proper deduplication scales better
5. **Location Awareness:** All messages track their origin zone

## Testing

The implementation includes comprehensive unit tests in `P2PService.test.js`:
- Location code setting and inclusion
- Message caching and deduplication
- Periodic sync start/stop
- Callback invocation
- Cache cleanup

## Usage Example

```javascript
// Initialize P2P with location
const locationCode = await getLocationCode();
P2PService.setLocationCode(locationCode);

// Connect as host or client
await P2PService.connect(locationCode);

// Start periodic sync
P2PService.startPeriodicSync(
  () => {
    // Publish callback - send all messages
    P2PService.broadcast({
      type: 'SYNC_MESSAGES',
      payload: { yaks: allYaks }
    });
  },
  null
);

// Cleanup
P2PService.stopPeriodicSync();
P2PService.destroy();
```

## Performance Considerations

1. **Message Cache Size:** Limited to 1000 messages to prevent memory issues
2. **Cache TTL:** 24 hours matches yak expiration time
3. **Sync Interval:** 5 seconds balances responsiveness and network usage
4. **Bulk Sync:** Reduces number of individual messages sent
5. **Smart Deduplication:** Multiple layers prevent unnecessary processing

## Future Enhancements

1. **Adaptive Sync Interval:** Adjust based on network activity
2. **Compression:** Compress bulk sync messages
3. **Delta Sync:** Only send new messages since last sync
4. **Priority Messages:** Prioritize recent or high-score yaks
5. **Location-based Filtering:** Filter messages by location code before processing