# 🔍 Debug: Room Not Found Error

## Problem
You're getting "Room not found" when trying to join room `1234`.

## Root Cause
Rooms are stored in **server memory** (not database). When you restart the server, all rooms are deleted.

## Solution: Create Room AFTER Server Starts

### ❌ Wrong Flow (Causes Error):
1. Create room `1234` → Server stores it
2. Restart server → Room `1234` is deleted from memory
3. Try to join room `1234` → "Room not found" ❌

### ✅ Correct Flow:
1. Start server (keep it running)
2. Create room `1234` → Server stores it
3. Join room `1234` → Works! ✅

## Step-by-Step Fix

### 1. Make Sure Server is Running
```bash
cd video-meet/server
node index.js
```

**Keep this terminal open!** Don't close or restart it.

You should see:
```
🚀 Server running on port 5001
📹 WebRTC signaling server ready
🎤 Audio translation powered by Groq
```

### 2. Open Client
In a NEW terminal:
```bash
cd video-meet/client
npm start
```

Browser opens at `http://localhost:3000`

### 3. Create Room (Tab 1)
1. Click "Create Room"
2. Fill in:
   - Name: `raja`
   - Email: `raja@test.com`
   - Room ID: `1234` (or click Generate)
   - Passcode: `test123`
   - Date: Today's date
   - Time: Current time
   - Language: Spanish
3. Click "Create Room"

**Check server console** - you should see:
```
✅ Room created: 1234 by raja
```

### 4. Join Room (Tab 2)
**Without closing the server!**

1. Open new tab: `http://localhost:3000`
2. Click "Join Room"
3. Fill in:
   - Name: `uhuo`
   - Email: `nikol@gmail.com`
   - Room ID: `1234` (same as created)
   - Passcode: `test123` (same as created)
   - Language: Spanish
4. Click "Join Room"

**Should work now!** ✅

## Why This Happens

The server uses an in-memory Map to store rooms:
```javascript
const rooms = new Map();
```

This means:
- ✅ Fast and simple
- ❌ Lost on server restart
- ❌ Not persistent

## Quick Test

### Test if Server is Running:
Open browser: `http://localhost:5001/api/rooms`

**Expected:** `[]` (empty array) or list of rooms

**If error:** Server is not running!

### Test Room Creation:
Use this command to create a test room:

**Windows PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5001/api/rooms" -Method POST -ContentType "application/json" -Body '{"creatorName":"Test","creatorEmail":"test@test.com","roomId":"TEST123","passcode":"pass123","meetingDate":"2026-03-13","meetingTime":"10:00"}'
```

**Expected response:**
```json
{
  "success": true,
  "room": {
    "id": "TEST123",
    "creatorName": "Test",
    ...
  }
}
```

### Test Room Verification:
```powershell
Invoke-RestMethod -Uri "http://localhost:5001/api/rooms/TEST123/verify" -Method POST -ContentType "application/json" -Body '{"passcode":"pass123"}'
```

**Expected response:**
```json
{
  "success": true
}
```

## Common Mistakes

### ❌ Mistake 1: Server Not Running
**Symptom:** "Network error" or "Room not found"
**Fix:** Start server with `node index.js`

### ❌ Mistake 2: Wrong Port
**Symptom:** Connection refused
**Fix:** Check server is on port 5001, client expects 5001

### ❌ Mistake 3: Server Restarted
**Symptom:** "Room not found" for previously created room
**Fix:** Create room again after server restart

### ❌ Mistake 4: Wrong Passcode
**Symptom:** "Invalid passcode"
**Fix:** Use exact same passcode when joining

### ❌ Mistake 5: Wrong Room ID
**Symptom:** "Room not found"
**Fix:** Copy exact Room ID from create page

## Permanent Solution (Optional)

To make rooms persistent across server restarts, you would need to:

1. **Add Database** (MongoDB, PostgreSQL, etc.)
2. **Save rooms to database** when created
3. **Load rooms from database** on server start

But for testing, just keep the server running! 🚀

## Verification Checklist

Before joining a room, verify:

- [ ] Server is running (check terminal)
- [ ] Server shows "Server running on port 5001"
- [ ] Room was created AFTER server started
- [ ] Server console shows "✅ Room created: [roomId]"
- [ ] Using correct Room ID
- [ ] Using correct Passcode
- [ ] Client is connected to localhost:5001

## Still Not Working?

### Check Server Logs
Look for these messages:
```
✅ Room created: 1234 by raja
```

If you don't see this, room creation failed!

### Check Browser Console
Press F12 → Console tab

Look for:
```
✅ Room created successfully
```

Or errors like:
```
❌ Room creation failed: [error]
```

### Check Network Tab
Press F12 → Network tab

1. Create room
2. Look for request to `/api/rooms`
3. Check response:
   - Status 200 = Success ✅
   - Status 400/404 = Error ❌

### Restart Everything
If still not working:

1. Close all browser tabs
2. Stop server (Ctrl+C)
3. Stop client (Ctrl+C)
4. Start server: `node index.js`
5. Start client: `npm start`
6. Create room (don't use old room IDs)
7. Join room immediately

## Success Indicators

✅ Server console: "✅ Room created: 1234 by raja"
✅ Browser console: "✅ Room created successfully"
✅ Can join room without "Room not found" error
✅ Both users see each other's video
✅ Can enable Auto-Translate

Your issue is simply that the room was created before the current server session. Create a new room and it will work! 🎉
