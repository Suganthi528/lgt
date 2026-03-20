# Video Meet with Translation - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Home.js    │  │ CreateRoom   │  │  JoinRoom    │        │
│  │              │  │              │  │              │        │
│  │ - Room List  │  │ - Form       │  │ - Form       │        │
│  │ - Navigation │  │ - Language   │  │ - Language   │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                  │                 │
│         └─────────────────┴──────────────────┘                 │
│                           │                                     │
│                           ▼                                     │
│                  ┌─────────────────┐                           │
│                  │  VideoCall.js   │                           │
│                  ├─────────────────┤                           │
│                  │ - WebRTC        │                           │
│                  │ - Video/Audio   │                           │
│                  │ - Translation   │◄──┐                       │
│                  │ - Chat          │   │                       │
│                  │ - Controls      │   │                       │
│                  └────────┬────────┘   │                       │
│                           │            │                       │
│                  ┌────────▼────────┐   │                       │
│                  │ LanguageSelector│   │                       │
│                  │                 │   │                       │
│                  │ - 15 Languages  │   │                       │
│                  │ - Dropdown UI   │   │                       │
│                  └─────────────────┘   │                       │
│                                        │                       │
└────────────────────────────────────────┼───────────────────────┘
                                         │
                                         │ Socket.io
                                         │ WebRTC Signaling
                                         │ Audio Data
                                         │
┌────────────────────────────────────────▼───────────────────────┐
│                      SERVER (Node.js)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    index.js (Main Server)                 │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │                                                           │ │
│  │  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │  │  Socket.io      │  │  Express API    │              │ │
│  │  │  Events         │  │  Endpoints      │              │ │
│  │  ├─────────────────┤  ├─────────────────┤              │ │
│  │  │ - join-room     │  │ - POST /rooms   │              │ │
│  │  │ - send-audio    │  │ - GET /rooms    │              │ │
│  │  │ - offer/answer  │  │ - POST /verify  │              │ │
│  │  │ - ice-candidate │  │                 │              │ │
│  │  │ - chat          │  │                 │              │ │
│  │  └────────┬────────┘  └─────────────────┘              │ │
│  │           │                                             │ │
│  │           ▼                                             │ │
│  │  ┌─────────────────────────────────┐                   │ │
│  │  │   Audio Processing Handler      │                   │ │
│  │  ├─────────────────────────────────┤                   │ │
│  │  │ 1. Receive base64 audio         │                   │ │
│  │  │ 2. Convert to WAV file          │                   │ │
│  │  │ 3. Send to OpenAI Whisper       │◄──────┐          │ │
│  │  │ 4. Get transcription            │       │          │ │
│  │  │ 5. Send to GPT-4o-mini          │◄──────┤          │ │
│  │  │ 6. Get translation              │       │          │ │
│  │  │ 7. Return to client             │       │          │ │
│  │  └─────────────────────────────────┘       │          │ │
│  │                                             │          │ │
│  └─────────────────────────────────────────────┼──────────┘ │
│                                                │            │
└────────────────────────────────────────────────┼────────────┘
                                                 │
                                                 │ HTTPS API
                                                 │
┌────────────────────────────────────────────────▼────────────────┐
│                         OpenAI API                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐      ┌──────────────────────┐       │
│  │   Whisper Model      │      │   GPT-4o-mini        │       │
│  │   (Speech-to-Text)   │      │   (Translation)      │       │
│  ├──────────────────────┤      ├──────────────────────┤       │
│  │ Input: Audio (WAV)   │      │ Input: Text          │       │
│  │ Output: Text         │──────►│ Output: Translated   │       │
│  │                      │      │         Text         │       │
│  └──────────────────────┘      └──────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Voice Translation

### Step-by-Step Process

```
1. USER SPEAKS
   │
   ├─► Browser captures audio via MediaRecorder
   │   (WebM format, 10 seconds max)
   │
   ▼
2. AUDIO ENCODING
   │
   ├─► Convert audio blob to Base64 string
   │
   ▼
3. SEND TO SERVER
   │
   ├─► Socket.io emit 'send-audio' event
   │   Payload: { audio: base64String, targetLanguage: 'es' }
   │
   ▼
4. SERVER PROCESSING
   │
   ├─► Decode Base64 to Buffer
   ├─► Write to temporary WAV file
   │
   ▼
5. WHISPER TRANSCRIPTION
   │
   ├─► Send WAV file to OpenAI Whisper API
   ├─► Receive transcribed text
   │   Example: "Hello, how are you?"
   │
   ▼
6. GPT TRANSLATION
   │
   ├─► Send text to GPT-4o-mini with prompt:
   │   "Translate this to Spanish: Hello, how are you?"
   ├─► Receive translated text
   │   Example: "Hola, ¿cómo estás?"
   │
   ▼
7. RETURN TO CLIENT
   │
   ├─► Socket.io emit 'transcription-result'
   │   Payload: {
   │     original: "Hello, how are you?",
   │     translated: "Hola, ¿cómo estás?",
   │     targetLanguage: "es",
   │     targetLanguageName: "Spanish"
   │   }
   │
   ▼
8. DISPLAY RESULTS
   │
   └─► Update UI with translation
       Show in Translations panel
```

## Component Hierarchy

```
App.js
│
├─── Home.js
│    └─── (Navigation to Create/Join)
│
├─── CreateRoom.js
│    └─── LanguageSelector.js
│
├─── JoinRoom.js
│    └─── LanguageSelector.js
│
└─── VideoCall.js
     ├─── RemoteVideo (component)
     ├─── Chat Panel
     ├─── People Panel
     ├─── Recordings Panel
     └─── Translations Panel ⭐ NEW
          ├─── Transcription Items
          └─── Clear Button
```

## State Management

### VideoCall Component State

```javascript
// Video/Audio State
- localStream
- remoteStreams (Map)
- isVideoEnabled
- isAudioEnabled
- isScreenSharing

// Translation State ⭐ NEW
- translationEnabled
- translationLanguage (from route state)
- isTranslating
- transcriptionResults (array)
- showTranscriptions
- audioRecorder
- isCapturingAudio

// Room State
- participants
- roomInfo
- isAdmin
- participantCount

// UI State
- showChat
- showPeople
- showRecordings
- showTranscriptions ⭐ NEW
```

## API Endpoints

### REST API (Express)
```
POST   /api/rooms              - Create new room
GET    /api/rooms              - List all rooms
POST   /api/rooms/:id/verify   - Verify room passcode
```

### Socket.io Events

#### Client → Server
```
join-room              - Join a video room
send-audio ⭐ NEW      - Send audio for translation
offer                  - WebRTC offer
answer                 - WebRTC answer
ice-candidate          - ICE candidate
send-chat-message      - Send chat message
toggle-video           - Toggle video on/off
toggle-audio           - Toggle audio on/off
toggle-raise-hand      - Raise/lower hand
send-reaction          - Send emoji reaction
admin-remove-participant - Remove user (admin only)
admin-end-meeting      - End meeting (admin only)
```

#### Server → Client
```
room-joined            - Successfully joined room
transcription-result ⭐ NEW - Translation result
transcription-error ⭐ NEW  - Translation error
user-joined            - New user joined
user-left              - User left
offer                  - WebRTC offer
answer                 - WebRTC answer
ice-candidate          - ICE candidate
new-chat-message       - New chat message
new-reaction           - New emoji reaction
participant-removed    - User was removed
meeting-ended          - Meeting ended by host
force-disconnect       - Forced disconnect
```

## Technology Stack

### Frontend
- React 19.2.3
- React Router 6.30.2
- Socket.io Client 4.8.3
- WebRTC APIs
- MediaRecorder API

### Backend
- Node.js with ES Modules
- Express 5.2.1
- Socket.io 4.8.3
- OpenAI SDK 6.25.0
- dotenv 17.3.1

### APIs
- OpenAI Whisper (Speech-to-Text)
- OpenAI GPT-4o-mini (Translation)

## Security Considerations

1. **API Key Protection**: OpenAI key stored in .env file
2. **Room Access**: Passcode required to join rooms
3. **Admin Controls**: Only host can remove users or end meeting
4. **Audio Privacy**: Audio processed server-side, not stored permanently
5. **Temporary Files**: Audio files deleted after processing

## Performance Optimizations

1. **Audio Chunking**: 10-second audio segments
2. **Lazy Loading**: Translation panel only loads when needed
3. **Efficient State Updates**: React.memo for RemoteVideo component
4. **Connection Pooling**: Reuse socket connections
5. **ICE Candidate Optimization**: Multiple STUN/TURN servers

## Future Enhancements

- [ ] Continuous real-time translation (streaming)
- [ ] Multiple simultaneous language support
- [ ] Translation history export (PDF/CSV)
- [ ] Voice synthesis for translated text (Text-to-Speech)
- [ ] Automatic language detection
- [ ] Translation confidence scores
- [ ] Offline translation caching
- [ ] Custom vocabulary/terminology support
