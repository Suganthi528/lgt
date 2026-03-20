# Quick Start Guide

## Fixed Issues
✅ ES Module vs CommonJS conflict resolved
✅ Server now uses ES modules consistently
✅ OpenAI audio transcription and translation integrated into main server
✅ Real-time voice translation feature implemented

## Running the Project

### Option 1: Run from root directory
```bash
# Start server (Terminal 1)
npm run server

# Start client (Terminal 2)
npm run client
```

### Option 2: Run from individual directories
```bash
# Terminal 1 - Start server
cd server
node index.js

# Terminal 2 - Start client
cd client
npm start
```

## What's Running
- **Server**: http://localhost:5001 (WebRTC signaling + OpenAI audio processing)
- **Client**: http://localhost:3000 (React app)

## Features Available
- ✅ Video conferencing with WebRTC
- ✅ Real-time voice translation (15 languages)
- ✅ Audio transcription using OpenAI Whisper
- ✅ Text translation using GPT-4o-mini
- ✅ Admin controls (remove participants, end meeting)
- ✅ Chat, reactions, and raise hand functionality
- ✅ Screen sharing and recording

## Using Voice Translation

### 1. Select Your Language
When creating or joining a room, select your preferred translation language from the dropdown (e.g., Spanish, French, German, etc.)

### 2. During the Meeting
- Click the **🌐 Translate** button in the control bar
- Speak for up to 10 seconds (button turns red 🔴)
- Wait for processing (button shows ⏳)
- View results in the **📝 Translations** panel

### 3. View Translations
- Click **Translations** button to see all your translations
- Original text and translated text shown side-by-side
- Clear all translations with the clear button

## Environment Variables
Make sure `video-meet/server/.env` contains:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Troubleshooting
- If you get "require is not defined" error, make sure `server/package.json` has `"type": "module"`
- If client can't connect, verify server is running on port 5001
- Check that your OpenAI API key is valid in `.env` file
- For translation issues, check microphone permissions in browser

## Documentation
- See `TRANSLATION_GUIDE.md` for detailed translation feature documentation
- See `DEPLOYMENT.md` for production deployment instructions
