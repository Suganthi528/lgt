# 🚀 Quick Start - Test Translation

## Step 1: Start Server
Open a terminal and run:
```bash
cd video-meet/server
node index.js
```

**Expected output:**
```
🚀 Server running on port 5001
📹 WebRTC signaling server ready - ADMIN PRIVILEGES ENABLED
🎤 Audio translation powered by Groq (Whisper + Llama 3.3)
👑 Admin can remove participants and end meetings
💬 Chat and reactions enabled
🖐️ Raise hand functionality enabled
📊 Room statistics enabled
```

## Step 2: Start Client
Open another terminal and run:
```bash
cd video-meet/client
npm start
```

Browser will open at `http://localhost:3000`

## Step 3: Test Translation

### Create Room (Tab 1)
1. Click "Create Room"
2. Enter your name: `User1`
3. Enter email: `user1@test.com`
4. Select language: `Spanish` (or any language)
5. Click "Create Room"
6. Copy the Room ID (e.g., `1234`)

### Join Room (Tab 2)
1. Open new tab: `http://localhost:3000`
2. Click "Join Room"
3. Enter name: `User2`
4. Enter email: `user2@test.com`
5. Enter Room ID: `1234` (from Tab 1)
6. Select language: `French` (different from User1)
7. Click "Join Room"

### Enable Translation
**In both tabs:**
1. Click the "Auto-Translate" button (🌐 icon)
2. Button should turn red and show "Auto-Translate ON"
3. You should see "🎤 Listening..." status

### Speak and Test
1. **In Tab 1:** Speak into microphone: "Hello, how are you?"
2. **In Tab 2:** You should see:
   - Original: "Hello, how are you?"
   - Translated: "Bonjour, comment allez-vous?"

3. **In Tab 2:** Speak: "Je vais bien, merci"
4. **In Tab 1:** You should see:
   - Original: "Je vais bien, merci"
   - Translated: "Estoy bien, gracias"

## What to Check

### Server Console
You should see:
```
🎤 CONTINUOUS AUDIO RECEIVED
   Speaker: User1 (socket-id)
   Room: 1234
   Audio size: 104651 chars
✅ Room found: 1234
   Participants in room: 2
   - User1 (socket-id-1) [es]
   - User2 (socket-id-2) [fr]
✅ Audio file created: temp_xxx.wav (78471 bytes)
🎙️ Sending to Groq Whisper for transcription...
📝 Transcribed: "Hello, how are you?"
🌐 Translation plan:
   French: User2
🔄 Translating to French...
✅ Translated to French: "Bonjour, comment allez-vous?"
   📤 Sent to User2 (socket-id-2)
✅ Sent French translation to 1/1 participants
✅ CONTINUOUS AUDIO PROCESSING COMPLETE
```

### Browser Console (DevTools)
You should see:
```
🎤 Starting continuous translation...
✅ Audio track found: Built-in Microphone
✅ Using MIME type: audio/webm
🚀 Starting recorder with 1-second timeslice...
✅ Recorder confirmed recording
🎤 Listening...
📦 Audio chunk 1 received: 15234 bytes
📦 Audio chunk 2 received: 16789 bytes
📤 Sending audio to server...
✅ Audio sent to server
🌐 Received translation from participant: {...}
```

### Meeting UI
You should see:
- Translation panel opens automatically
- Shows original text + translated text
- Updates in real-time as people speak
- Each translation shows speaker name and timestamp

## Troubleshooting

### No audio captured
- Check microphone permissions in browser
- Make sure mic is not muted
- Speak loudly and clearly
- Check browser console for errors

### No translation appears
- Check server is running (port 5001)
- Check server console for errors
- Verify Groq API key in `.env` file
- Check network tab in DevTools

### Translation is slow
- Groq should be fast (~3-4 seconds total)
- If slower, check your internet connection
- Check server console for API errors

### Wrong language
- Make sure you selected different languages for each user
- Check the language selector when joining
- Verify in server console: `[es]`, `[fr]`, etc.

## Success Indicators

✅ Server shows "Audio translation powered by Groq"
✅ Browser shows "🎤 Listening..." when Auto-Translate is ON
✅ Audio chunks are being captured (see console)
✅ Server receives audio and transcribes it
✅ Translation appears in the UI within 3-4 seconds
✅ Both users can see each other's translations

## Common Issues

### "insufficient_quota" error
- ❌ This was the OLD OpenAI error
- ✅ Should NOT happen with Groq (free unlimited)
- If you see this, server is still using OpenAI
- Restart the server: `Ctrl+C` then `node index.js`

### "Connection failed"
- Server not running on port 5001
- Check: `netstat -ano | findstr :5001` (Windows)
- Or: `lsof -i :5001` (Mac/Linux)

### "No audio track available"
- Browser didn't get microphone permission
- Refresh page and allow microphone access
- Check browser settings → Privacy → Microphone

## Performance Tips

1. **Use headphones** to avoid echo/feedback
2. **Speak clearly** for better transcription
3. **Wait 5 seconds** between sentences (audio chunk interval)
4. **Check internet** - Groq needs good connection
5. **Close other tabs** to free up resources

## Expected Timing

- Audio capture: Every 5 seconds
- Transcription: ~2-3 seconds
- Translation: ~1 second
- Total latency: ~3-4 seconds from speaking to seeing translation

Much faster than OpenAI! 🚀
