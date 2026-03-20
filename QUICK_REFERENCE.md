# Quick Reference Card

## 🚀 Starting the Application

```bash
# Terminal 1 - Server
cd video-meet/server
node index.js

# Terminal 2 - Client  
cd video-meet/client
npm start
```

**URLs**:
- Client: http://localhost:3000
- Server: http://localhost:5001

## 🌐 Using Translation

### Step 1: Select Language
- Create/Join Room page
- Choose from dropdown (15 languages)

### Step 2: Start Translation
- Click 🌐 "Translate" button
- Button turns red 🔴 (listening)
- Speak for up to 10 seconds

### Step 3: View Results
- Click 📝 "Translations" button
- See original + translated text
- Clear all with button

## 🎯 Supported Languages

| Language | Code | Flag |
|----------|------|------|
| English | en | 🇺🇸 |
| Spanish | es | 🇪🇸 |
| French | fr | 🇫🇷 |
| German | de | 🇩🇪 |
| Italian | it | 🇮🇹 |
| Portuguese | pt | 🇵🇹 |
| Russian | ru | 🇷🇺 |
| Japanese | ja | 🇯🇵 |
| Korean | ko | 🇰🇷 |
| Chinese | zh | 🇨🇳 |
| Arabic | ar | 🇸🇦 |
| Hindi | hi | 🇮🇳 |
| Turkish | tr | 🇹🇷 |
| Dutch | nl | 🇳🇱 |
| Polish | pl | 🇵🇱 |

## 🎮 Control Bar Buttons

| Button | Function |
|--------|----------|
| 🎤 | Toggle microphone |
| 📹 | Toggle camera |
| 🖥️ | Share screen |
| 💬 | Open chat |
| 👥 | View participants |
| 🌐 | **Translate speech** |
| 📝 | **View translations** |
| 🎥 | Record meeting |
| 📁 | View recordings |
| 😊 | Send reactions |
| ✋ | Raise hand |
| 📊 | View stats |
| 🔄 | Refresh connection |
| 📞❌ | Leave meeting |

## 🔧 Configuration

### Environment Variables
```bash
# video-meet/server/.env
OPENAI_API_KEY=your_key_here
```

### Adjust Audio Duration
```javascript
// video-meet/client/src/components/VideoCall.js
// Line ~1150 in startTranslation function
setTimeout(() => {
  recorder.stop();
}, 10000); // Change milliseconds here
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Translation not working | Check OpenAI API key, microphone permissions |
| No audio captured | Enable microphone in meeting, check browser permissions |
| Slow translation | Check internet connection, verify OpenAI API status |
| Wrong language | Verify language selection before joining room |
| Server won't start | Check port 5001 is available, verify package.json has "type": "module" |
| Client won't connect | Ensure server is running on port 5001 |

## 📊 API Costs

- **Per Translation**: ~$0.0011
  - Whisper: ~$0.001 (10 seconds)
  - GPT-4o-mini: ~$0.0001

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| QUICKSTART.md | Getting started guide |
| TRANSLATION_GUIDE.md | Complete translation feature guide |
| ARCHITECTURE.md | System architecture & data flow |
| IMPLEMENTATION_SUMMARY.md | What was built & how |
| DEPLOYMENT.md | Production deployment guide |
| QUICK_REFERENCE.md | This file - quick lookup |

## 🎯 Key Features

✅ Video conferencing with WebRTC  
✅ Real-time voice translation (15 languages)  
✅ Audio transcription (OpenAI Whisper)  
✅ Text translation (GPT-4o-mini)  
✅ Admin controls (remove users, end meeting)  
✅ Chat, reactions, raise hand  
✅ Screen sharing & recording  
✅ Translation history panel  

## 🔑 Important Notes

1. **Audio Duration**: 10 seconds per translation (adjustable)
2. **API Key Required**: Must have valid OpenAI API key
3. **Browser Support**: Chrome, Firefox, Edge (MediaRecorder API)
4. **Network**: Stable internet required for translation
5. **Costs**: Each translation uses OpenAI API credits

## 📞 Quick Commands

```bash
# Install dependencies
cd video-meet/server && npm install
cd video-meet/client && npm install

# Start server
cd video-meet/server && node index.js

# Start client
cd video-meet/client && npm start

# Check diagnostics
# Use browser DevTools Console (F12)
# Check server terminal for logs
```

## 🎨 UI States

### Translation Button States
- 🌐 **Ready**: Click to start translation
- 🔴 **Listening**: Recording audio (10s)
- ⏳ **Processing**: Sending to OpenAI
- 📝 **Complete**: View in Translations panel

### Visual Feedback
- Red button = Recording audio
- Orange button = Processing translation
- Badge number = New translations available
- Panel auto-opens = New result received

## 💡 Pro Tips

1. **Use Headphones**: Prevents echo and feedback
2. **Speak Clearly**: Better transcription accuracy
3. **Short Phrases**: 10 seconds is optimal
4. **Check Language**: Verify selection before joining
5. **Monitor Costs**: Track OpenAI API usage
6. **Save Translations**: Copy important ones before clearing

## 🚨 Emergency Actions

### If Translation Fails
1. Check browser console (F12)
2. Verify microphone permissions
3. Check server logs
4. Restart server if needed

### If Meeting Crashes
1. Refresh browser page
2. Rejoin with same credentials
3. Check server is running
4. Verify network connection

## 📈 Performance Tips

- Close unused browser tabs
- Use wired internet connection
- Ensure good lighting for video
- Use external microphone for better audio
- Limit participants for better performance

---

**Need More Help?**
- See TRANSLATION_GUIDE.md for detailed instructions
- See ARCHITECTURE.md for technical details
- Check server logs for error messages
- Review browser console for client errors
