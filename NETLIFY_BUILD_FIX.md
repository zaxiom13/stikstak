# Netlify Build Fix - React Hook Dependency Issue

## Problem

The Netlify build was failing with the following ESLint error:

```
Line 323:6: React Hook useEffect has a missing dependency: 'yaks'. 
Either include it or remove the dependency array
```

The error occurred because:
1. Netlify sets `process.env.CI = true` which treats ESLint warnings as errors
2. The `useEffect` hook (lines 96-323) had an empty dependency array `[]`
3. Inside the hook, on line 152, there was a direct reference to the `yaks` state variable:
   ```javascript
   yaks.forEach(yak => {
     P2PService.broadcast({ type: 'NEW_YAK', payload: yak });
   });
   ```

## Why We Can't Just Add 'yaks' to Dependencies

Adding `yaks` to the dependency array would cause the entire P2P initialization to re-run every time a yak is added/removed, which would:
- Disconnect and reconnect all peers
- Reset all P2P connections
- Break the application functionality

## Solution: Use useRef

The proper solution is to use a `useRef` to maintain access to the current `yaks` value without making it a dependency.

### Changes Made

#### 1. Import useRef
```javascript
import React, { useState, useEffect, useRef } from 'react';
```

#### 2. Create yaksRef
```javascript
const yaksRef = useRef([]);
```

#### 3. Keep yaksRef Synchronized
Modified the existing `useEffect` that handles caching to also update the ref:
```javascript
// Save to cache whenever yaks change and update ref
useEffect(() => {
  yaksRef.current = yaks;
  if (yaks.length > 0) {
    localStorage.setItem(YAK_CACHE_KEY, JSON.stringify(yaks));
  }
}, [yaks]);
```

#### 4. Use yaksRef in Message Handler
Changed the REQUEST_MESSAGES handler to use the ref:
```javascript
} else if (data.type === 'REQUEST_MESSAGES') {
  console.log('Peer requested messages, publishing all yaks...');
  yaksRef.current.forEach(yak => {
    P2PService.broadcast({ type: 'NEW_YAK', payload: yak });
  });
}
```

## Files Modified

1. **client/src/App.js**
   - Added `useRef` import
   - Created `yaksRef`
   - Updated cache effect to sync `yaksRef`
   - Changed line 154 to use `yaksRef.current` instead of `yaks`

2. **client/src/services/P2PService.test.js**
   - Fixed syntax error (extra closing brace at end of file)

## Verification

Build tested with `CI=true` to simulate Netlify environment:

```bash
cd client && CI=true npm run build
# Result: ✅ Compiled successfully
```

## Why This Solution Works

1. **No Dependency Issues:** `yaksRef` doesn't need to be in the dependency array because refs don't trigger re-renders
2. **Always Current:** The ref always has the latest `yaks` value because we update it in a separate effect
3. **No Re-initialization:** The P2P initialization effect only runs once on mount
4. **Maintains Functionality:** All existing features continue to work as expected

## Key Takeaway

When you need to access the latest state value inside a `useEffect` with an empty dependency array, use a ref that's kept synchronized with the state in a separate effect. This is a common React pattern for avoiding stale closures without causing unwanted re-renders.

## Next Steps

1. Commit the changes to the repository
2. Push to trigger a new Netlify build
3. The build should now succeed ✅