# Real-Time Voice Translation Guide

## Overview
Your video meeting application now supports real-time voice-to-text transcription and translation using OpenAI's Whisper and GPT-4o-mini models.

## Features Implemented

### 1. Language Selection
- **Location**: Create Room & Join Room pages
- **Supported Languages**: 15 languages including English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, Turkish, Dutch, and Polish
- **How it works**: Users select their preferred translation language before joining a meeting

### 2. Real-Time Translation
- **Activation**: Click the "Translate" button (🌐) in the video call control bar
- **Process**:
  1. Click "Translate" to start capturing audio (button turns red 🔴)
  2. Speak for up to 10 seconds (auto-stops after 10s)
  3. Audio is sent to OpenAI Whisper for transcription
  4. Text is translated to your selected language using GPT-4o-mini
  5. Results appear in the Translations panel

### 3. Translation Panel
- **Access**: Click "Translations" button (📝) to view all translations
- **Features**:
  - Shows original text and translated text side-by-side
  - Timestamps for each translation
  - Clear all translations button
  - Auto-displays when new translation arrives

## How to Use

### For Meeting Hosts (Create Room):
1. Go to "Create Room"
2. Fill in meeting details
3. Select your preferred translation language from the dropdown
4. Create the room and start the meeting
5. Use the "Translate" button during the call to translate speech

### For Participants (Join Room):
1. Go to "Join Room"
2. Enter room details
3. Select your preferred translation language
4. Join the meeting
5. Use the "Translate" button to translate speech

### During the Meeting:
1. **Start Translation**: Click the 🌐 "Translate" button
2. **Speak**: The button turns red (🔴) indicating it's listening
3. **Wait**: After 10 seconds or manual stop, it processes your speech
4. **View Results**: Translation appears in the Translations panel
5. **Repeat**: Click again to translate more speech

## Technical Details

### Frontend (React)
- **LanguageSelector Component**: Dropdown for language selection
- **VideoCall Component**: 
  - Audio capture using MediaRecorder API
  - Socket.io communication with backend
  - Real-time display of translations

### Backend (Node.js)
- **OpenAI Whisper**: Converts speech to text
- **GPT-4o-mini**: Translates text to target language
- **Socket.io**: Real-time communication

### Audio Processing Flow:
```
User Speech → MediaRecorder → WebM Audio → Base64 Encoding
    ↓
Socket.io → Server
    ↓
OpenAI Whisper (Speech-to-Text)
    ↓
GPT-4o-mini (Translation)
    ↓
Socket.io → Client → Display
```

## Configuration

### Environment Variables
Ensure your `.env` file in `video-meet/server/` contains:
```
OPENAI_API_KEY=your_openai_api_key_here
```

### Supported Audio Formats
- Input: WebM audio (captured from browser)
- Converted to: WAV for Whisper processing

## Limitations & Considerations

1. **Audio Duration**: Currently set to 10 seconds per translation
   - Adjustable in `VideoCall.js` (line with `setTimeout` in `startTranslation`)

2. **API Costs**: Each translation uses:
   - Whisper API for transcription
   - GPT-4o-mini for translation
   - Monitor your OpenAI usage

3. **Network Requirements**: 
   - Stable internet connection required
   - Audio data is sent to server for processing

4. **Browser Compatibility**:
   - Requires MediaRecorder API support
   - Works best in Chrome, Firefox, Edge

## Customization Options

### Change Audio Capture Duration
In `video-meet/client/src/components/VideoCall.js`:
```javascript
// Find this line in startTranslation function:
setTimeout(() => {
  if (recorder.state === 'recording') {
    recorder.stop();
    setIsCapturingAudio(false);
  }
}, 10000); // Change 10000 to desired milliseconds
```

### Add More Languages
In `video-meet/client/src/components/LanguageSelector.js`:
```javascript
const SUPPORTED_LANGUAGES = [
  // Add new language:
  { code: 'language_code', name: 'Language Name', flag: '🏳️' },
];
```

Then update backend in `video-meet/server/index.js`:
```javascript
const languageNames = {
  'language_code': 'Language Name',
  // ... existing languages
};
```

## Troubleshooting

### Translation Not Working
1. Check OpenAI API key is valid
2. Verify microphone permissions in browser
3. Check browser console for errors
4. Ensure server is running on port 5001

### No Audio Captured
1. Check microphone is enabled in meeting
2. Verify audio track exists in local stream
3. Check browser microphone permissions

### Translation Takes Too Long
1. Check internet connection
2. Verify OpenAI API is responding
3. Check server logs for errors

## Future Enhancements

Potential improvements:
- Real-time streaming translation (continuous)
- Multiple language support per meeting
- Translation history export
- Voice synthesis for translated text
- Automatic language detection
- Translation accuracy confidence scores

## Support

For issues or questions:
1. Check server logs: `video-meet/server/`
2. Check browser console for client errors
3. Verify OpenAI API key and quota
4. Review socket.io connection status
