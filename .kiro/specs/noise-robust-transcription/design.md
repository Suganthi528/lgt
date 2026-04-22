# Design Document — Noise-Robust Transcription & Language Identification

## Overview

This design addresses two root causes of poor transcription quality in VideoMeet Pro:

1. **Noise sensitivity** — the VAD pipeline triggers on background noise, sends too-short or noise-only audio chunks to Whisper, and the hallucination filter is too narrow.
2. **Language misidentification** — Whisper is called without a `language` hint, so it auto-detects the spoken language and frequently guesses wrong for non-English speakers. The UI also conflates "speaker language" with "translation language" into a single selector.

The fix touches three layers: the client-side VAD/audio pipeline (`VideoCall.js`), the server-side transcription call (`server/index.js`), and the join/create forms (`JoinRoom.js`, `CreateRoom.js`, `LanguageSelector.js`).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (React)                                             │
│                                                             │
│  JoinRoom / CreateRoom                                      │
│  ├── SpeakerLanguageSelector  ("I will speak in")          │
│  └── TranslationLanguageSelector  ("Translate to")         │
│                                                             │
│  VideoCall — VAD Pipeline                                   │
│  ├── AudioContext                                           │
│  │   ├── HighPassFilter (cutoff: 100 Hz)                   │
│  │   ├── PreEmphasisFilter (boost > 1 kHz)                 │
│  │   └── AnalyserNode (RMS measurement)                    │
│  ├── VAD State Machine                                      │
│  │   ├── Onset: 3-interval confirmation + pre-roll buffer  │
│  │   ├── Silence: 1000ms gap + hysteresis                  │
│  │   └── Max chunk: 12s split                              │
│  └── Socket emit: continuous-audio                         │
│      { audio, roomId, speakerName, speakerLanguage }       │
│                                                             │
│  Language Bar (in-meeting)                                  │
│  └── Shows: "🎤 Speaking: Hindi → Translating to: English" │
└─────────────────────────────────────────────────────────────┘
                          │ socket.io
┌─────────────────────────────────────────────────────────────┐
│  Server (Node.js)                                           │
│                                                             │
│  join-room handler                                          │
│  └── participant record: { speakerLanguage, translationLanguage } │
│                                                             │
│  update-language handler (new)                             │
│  └── updates participant.speakerLanguage in-place          │
│                                                             │
│  continuous-audio handler                                   │
│  ├── Groq Whisper call                                      │
│  │   ├── language: participant.speakerLanguage             │
│  │   └── prompt: lastTranscription[roomId][socketId]       │
│  ├── Expanded hallucination filter (20+ patterns)          │
│  └── Per-language translation → participant-translation    │
└─────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### 1. `SpeakerLanguageSelector` (new, client)

A thin wrapper around the existing `LanguageSelector` component with a distinct label.

```js
// Props
{
  selectedLanguage: string,   // BCP-47 code, e.g. 'hi'
  onLanguageChange: (code: string) => void,
  label: string               // "I will speak in"
}
```

### 2. VAD State Machine (updated, `VideoCall.js`)

The existing VAD loop is extended with:

| Parameter | Old value | New value | Reason |
|---|---|---|---|
| `SPEECH_THRESHOLD` | 0.012 | 0.015 | Reduce false triggers |
| `SILENCE_THRESHOLD` | 0.008 | 0.009 | Hysteresis: ~40% below onset |
| `SILENCE_GAP_MS` | 800 | 1000 | Avoid mid-sentence cuts |
| `MIN_CHUNK_MS` | 400 | 600 | Reject noise-only fragments |
| `MAX_CHUNK_MS` | 8000 | 12000 | Allow longer utterances |
| `ONSET_CONFIRM_COUNT` | 1 | 3 | Require 3 consecutive above-threshold readings |
| `PRE_ROLL_MS` | 0 | 200 | Capture word beginnings |
| High-pass cutoff | 80 Hz | 100 Hz | Better noise rejection |

**Pre-roll buffer**: A circular buffer of the last 200ms of raw audio chunks is maintained. When speech onset is confirmed, the pre-roll is prepended to the new recording.

**Hysteresis check**: `SILENCE_THRESHOLD = 0.009` vs `SPEECH_THRESHOLD = 0.015` → ratio = 0.6, meaning silence threshold is 40% lower than onset threshold (satisfies the ≥30% requirement).

### 3. `continuous-audio` socket payload (updated)

```js
// New field added
{
  audio: string,          // base64 data URL
  roomId: string,
  speakerName: string,
  speakerLanguage: string // NEW — BCP-47 code from participant's selection
}
```

### 4. Server `join-room` handler (updated)

Participant record gains a new field:

```js
const participant = {
  // ... existing fields ...
  speakerLanguage: speakerLanguage || 'en',      // NEW
  translationLanguage: translationLanguage || 'en'
};
```

### 5. Server `update-language` handler (new)

```js
socket.on('update-language', ({ speakerLanguage, translationLanguage }) => {
  // Updates participant record in-place, no room rejoin needed
});
```

### 6. Whisper API call (updated, server)

```js
const transcription = await groq.audio.transcriptions.create({
  file: fs.createReadStream(tempFilePath),
  model: "whisper-large-v3",
  response_format: "json",
  language: speakerLang,          // NEW — explicit language hint
  prompt: lastTranscription || undefined  // NEW — context chaining
});
```

### 7. Expanded hallucination filter (updated, server)

```js
const HALLUCINATIONS = [
  /^(thank you|thanks|you|bye|goodbye|see you|okay|ok|sure|right|yes|no|yeah|nope|hmm|uh|um|ah|oh|wow)\.?$/i,
  /^\[.*\]$/,           // [Music], [Applause], [Silence]
  /^\(.*\)$/,           // (music), (silence)
  /^[.,!?…\s]+$/,       // punctuation only
  /^(um+|uh+|hmm+|ah+|oh+|eh+)$/i,
  /^(subtitles|subtitle|captions|caption|transcribed by|translated by).*$/i,
  /^(www\.|http)/i,     // URLs (hallucination artifact)
  /^.{1,2}$/            // 1-2 character outputs
];
```

---

## Data Models

### Participant record (server, updated)

```js
{
  id: string,
  name: string,
  email: string,
  isAdmin: boolean,
  isVideoEnabled: boolean,
  isAudioEnabled: boolean,
  isScreenSharing: boolean,
  hasRaisedHand: boolean,
  speakerLanguage: string,      // NEW — language participant speaks in
  translationLanguage: string,  // existing — language to receive translations in
  joinedAt: string
}
```

### Per-room transcription context (server, new)

```js
// Map<roomId, Map<socketId, lastTranscriptionText>>
const lastTranscriptions = new Map();
```

### Translation card data (client)

```js
{
  id: number,
  original: string,
  translated: string,
  sourceLang: string,           // NEW — language of the original speech
  sourceLangName: string,       // NEW — human-readable name
  targetLanguage: string,
  targetLanguageName: string,
  speakerName: string,
  timestamp: string
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: VAD onset requires 3 consecutive above-threshold readings

*For any* sequence of RMS values, the VAD state machine SHALL NOT transition to "speaking" state unless at least 3 consecutive readings are all above `SPEECH_THRESHOLD`. A sequence with fewer than 3 consecutive above-threshold readings must leave the state as "silent".

**Validates: Requirements 1.2**

---

### Property 2: Minimum chunk duration rejection

*For any* assembled audio chunk, if the duration from `speechStartTime` to `recorder.stop()` is less than 600 milliseconds, the chunk SHALL be discarded and not sent to the server.

**Validates: Requirements 1.3**

---

### Property 3: Hallucination filter completeness

*For any* string in the set of known Whisper silence artifacts (the 20+ patterns defined in the expanded filter), applying the hallucination filter SHALL return `true` (i.e., the string is rejected and not broadcast).

**Validates: Requirements 1.5**

---

### Property 4: Speaker language always passed to Whisper

*For any* participant with any stored `speakerLanguage` code (from the 15 supported languages), when that participant's audio chunk is processed by the server, the Groq Whisper API call SHALL include a `language` field equal to that participant's `speakerLanguage`.

**Validates: Requirements 2.2**

---

### Property 5: Silence gap hysteresis

*For any* RMS sequence where the value drops below `SILENCE_THRESHOLD` but the elapsed silence duration is less than 1000 milliseconds, the VAD SHALL NOT cut the chunk. The chunk SHALL only be cut after at least 1000 milliseconds of continuous silence.

**Validates: Requirements 3.2**

---

### Property 6: Pre-roll buffer inclusion

*For any* speech onset event, the assembled chunk sent to the server SHALL contain audio data that begins at most 200 milliseconds before the confirmed onset time, ensuring word beginnings are not clipped.

**Validates: Requirements 3.1**

---

### Property 7: Long chunk splitting

*For any* speech chunk that reaches `MAX_CHUNK_MS` (12 seconds) while still recording, the system SHALL stop the current recorder and send the chunk immediately, then restart recording for the continuation, so that no single chunk exceeds 12 seconds.

**Validates: Requirements 3.4**

---

### Property 8: Translation card contains source language and speaker

*For any* translation result object (whether from `transcription-result` or `participant-translation`), the rendered translation card in the UI SHALL contain both the speaker's name and the source language name as visible text.

**Validates: Requirements 4.3, 4.4**

---

### Property 9: Auto-translate status includes speaker language name

*For any* active auto-translate session with any configured speaker language, the status indicator text SHALL contain the human-readable name of that speaker language (e.g. "Hindi", "French").

**Validates: Requirements 4.2**

---

## Error Handling

| Scenario | Handling |
|---|---|
| `speakerLanguage` not in Whisper's supported list | Fall back to `undefined` (auto-detect), log a warning |
| Pre-roll buffer not yet filled (first chunk) | Send chunk without pre-roll, no error |
| `update-language` received for unknown socket | Log and ignore silently |
| Whisper returns empty string with explicit language | Apply hallucination filter, discard, release speaker lock |
| `lastTranscriptions` entry missing for a socket | Pass `undefined` as prompt (Whisper handles gracefully) |

---

## Testing Strategy

### Unit Testing

Unit tests verify specific examples and edge cases:

- High-pass filter is created with `frequency.value === 100`
- `SILENCE_THRESHOLD / SPEECH_THRESHOLD <= 0.7` (hysteresis invariant)
- Both language selectors render with correct labels on Join/Create forms
- `update-language` socket handler updates the correct participant record
- Whisper prompt is `undefined` when no previous transcription exists

### Property-Based Testing

Property-based testing is used for the universal behavioral properties above. The library used is **fast-check** (JavaScript), configured to run a minimum of **100 iterations** per property.

Each property-based test is tagged with:
```
// Feature: noise-robust-transcription, Property N: <property text>
```

**Generators needed:**

- `rmsSequenceArb`: generates arrays of floats in [0, 0.1] representing RMS readings
- `chunkDurationArb`: generates integers in [0, 15000] representing chunk durations in ms
- `hallucStringArb`: generates strings from the known hallucination patterns
- `languageCodeArb`: generates one of the 15 supported BCP-47 language codes
- `translationCardArb`: generates `{ speakerName, sourceLangName, original, translated }` objects

**Test file location**: `VIDEO-TRANSLATE/client/src/__tests__/transcription.test.js` (client-side VAD logic) and `VIDEO-TRANSLATE/server/__tests__/transcription.test.js` (server-side Whisper/hallucination logic).

**Minimum iterations**: 100 per property (fast-check default is 100, explicitly set via `{ numRuns: 100 }`).
