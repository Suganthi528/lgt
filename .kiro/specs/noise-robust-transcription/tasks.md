# Implementation Plan — Noise-Robust Transcription & Language Identification

- [ ] 1. Update server participant model and join-room handler
  - Add `speakerLanguage` field to the participant record in `server/index.js` `join-room` handler, stored separately from `translationLanguage`
  - Update the `join-room` socket payload destructuring to accept `speakerLanguage`
  - Initialize `lastTranscriptions` Map (`Map<roomId, Map<socketId, string>>`) at the top of `server/index.js`
  - _Requirements: 2.1_

- [ ] 2. Add `update-language` socket event handler on the server
  - Implement the `update-language` handler in `server/index.js` that finds the participant by socket ID and updates both `speakerLanguage` and `translationLanguage` in-place
  - _Requirements: 2.4_

- [ ] 3. Upgrade Whisper transcription call with language hint and prompt chaining
  - In the `continuous-audio` handler in `server/index.js`, read `speakerLanguage` from the sender's participant record
  - Pass `language: speakerLang` to the Groq Whisper API call
  - Pass `prompt: lastTranscriptions.get(roomId)?.get(socket.id)` to the Whisper API call
  - After a successful transcription, store the result in `lastTranscriptions`
  - Log the language code used for each transcription call
  - _Requirements: 2.2, 2.3, 1.4_

- [ ]* 3.1 Write property test: speaker language always passed to Whisper
  - **Property 4: Speaker language always passed to Whisper**
  - Use fast-check `languageCodeArb` to generate all 15 supported language codes
  - Mock the Groq client and assert the `language` field in the API call equals the participant's `speakerLanguage`
  - Tag: `// Feature: noise-robust-transcription, Property 4: Speaker language always passed to Whisper`
  - **Validates: Requirements 2.2**

- [ ] 4. Expand the hallucination filter on the server
  - Replace the existing 3-pattern `HALLUCINATIONS` array in `server/index.js` with the expanded 8-pattern set from the design (covering punctuation-only, URLs, 1-2 char outputs, subtitle artifacts, bracket/paren patterns, filler words)
  - Apply the same expanded filter in both `send-audio` and `continuous-audio` handlers
  - _Requirements: 1.5_

- [ ]* 4.1 Write property test: hallucination filter completeness
  - **Property 3: Hallucination filter completeness**
  - Use fast-check `hallucStringArb` to generate strings from each of the 8 hallucination patterns
  - Assert that every generated string is matched by at least one filter regex
  - Tag: `// Feature: noise-robust-transcription, Property 3: Hallucination filter completeness`
  - **Validates: Requirements 1.5**

- [ ] 5. Update `LanguageSelector` and add dual-selector support to forms
  - Add a `label` prop to `LanguageSelector.js` so the label text is configurable
  - In `JoinRoom.js`, replace the single `LanguageSelector` with two: one for `speakerLanguage` (label: "🎤 I will speak in") and one for `translationLanguage` (label: "🌐 Translate incoming speech to")
  - In `CreateRoom.js`, apply the same dual-selector change
  - Pass `speakerLanguage` in the navigation state alongside `translationLanguage`
  - _Requirements: 2.5_

- [ ] 6. Update `VideoCall.js` to send `speakerLanguage` and handle `update-language`
  - Add `speakerLanguage` state initialized from `location.state.speakerLanguage`
  - Include `speakerLanguage` in the `join-room` socket emit
  - Include `speakerLanguage` in every `continuous-audio` socket emit
  - Add an `update-language` emit when the user changes their speaker language in-meeting
  - _Requirements: 2.2, 2.4_

- [ ] 7. Upgrade the VAD pipeline in `VideoCall.js`
  - Update VAD constants: `SPEECH_THRESHOLD = 0.015`, `SILENCE_THRESHOLD = 0.009`, `SILENCE_GAP_MS = 1000`, `MIN_CHUNK_MS = 600`, `MAX_CHUNK_MS = 12000`
  - Raise the high-pass filter cutoff from 80 Hz to 100 Hz
  - Add `ONSET_CONFIRM_COUNT = 3` — require 3 consecutive above-threshold readings before transitioning to speaking state; add `onsetCount` counter to the VAD state machine
  - Implement a 200ms pre-roll circular buffer: maintain a rolling array of the last 200ms of `MediaRecorder` chunks; prepend it when speech onset is confirmed
  - Update the max-chunk split logic to use the new `MAX_CHUNK_MS = 12000`
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4_

- [ ]* 7.1 Write property test: VAD onset requires 3 consecutive readings
  - **Property 1: VAD onset requires 3 consecutive above-threshold readings**
  - Use fast-check `rmsSequenceArb` to generate arrays of RMS floats
  - Simulate the VAD state machine and assert it only enters speaking state after 3 consecutive above-threshold values
  - Tag: `// Feature: noise-robust-transcription, Property 1: VAD onset requires 3 consecutive above-threshold readings`
  - **Validates: Requirements 1.2**

- [ ]* 7.2 Write property test: minimum chunk duration rejection
  - **Property 2: Minimum chunk duration rejection**
  - Use fast-check `chunkDurationArb` to generate durations in [0, 1200] ms
  - Assert that any duration < 600ms results in the chunk being discarded (not sent)
  - Tag: `// Feature: noise-robust-transcription, Property 2: Minimum chunk duration rejection`
  - **Validates: Requirements 1.3**

- [ ]* 7.3 Write property test: silence gap hysteresis
  - **Property 5: Silence gap hysteresis**
  - Use fast-check to generate silence durations in [0, 2000] ms
  - Assert that the VAD only cuts the chunk when silence duration >= 1000ms
  - Tag: `// Feature: noise-robust-transcription, Property 5: Silence gap hysteresis`
  - **Validates: Requirements 3.2**

- [ ]* 7.4 Write property test: long chunk splitting
  - **Property 7: Long chunk splitting**
  - Use fast-check to generate elapsed times in [12000, 20000] ms
  - Assert that when elapsed >= MAX_CHUNK_MS, the recorder is stopped and restarted
  - Tag: `// Feature: noise-robust-transcription, Property 7: Long chunk splitting`
  - **Validates: Requirements 3.4**

- [ ]* 7.5 Write property test: pre-roll buffer inclusion
  - **Property 6: Pre-roll buffer inclusion**
  - Assert that the assembled chunk always includes data from the pre-roll buffer when speech onset is confirmed
  - Tag: `// Feature: noise-robust-transcription, Property 6: Pre-roll buffer inclusion`
  - **Validates: Requirements 3.1**

- [ ] 8. Add "no speech detected" warning to `VideoCall.js`
  - Track a `silenceSince` timestamp in the VAD loop; if translation is enabled and the participant has been silent for > 5000ms, set `translationStatus` to "🎙️ No speech detected — check your microphone"
  - Reset the warning when speech is detected again
  - _Requirements: 1.6_

- [ ] 9. Add language display bar to the VideoCall UI
  - Add a language info bar in the translation control area showing "🎤 Speaking: {speakerLangName} → 🌐 Translating to: {translationLangName}" when auto-translate is active
  - Add an inline `LanguageSelector` (speaker language only) to the translation panel so participants can change their speaker language mid-meeting
  - When the speaker language changes, emit `update-language` to the server
  - Update translation card rendering to include `sourceLangName` and `speakerName`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 9.1 Write property test: translation card contains source language and speaker
  - **Property 8: Translation card contains source language and speaker**
  - Use fast-check `translationCardArb` to generate random translation result objects
  - Assert that the rendered card string contains both `speakerName` and `sourceLangName`
  - Tag: `// Feature: noise-robust-transcription, Property 8: Translation card contains source language and speaker`
  - **Validates: Requirements 4.3, 4.4**

- [ ]* 9.2 Write property test: auto-translate status includes speaker language name
  - **Property 9: Auto-translate status includes speaker language name**
  - Use fast-check `languageCodeArb` to generate language codes
  - Assert that the status string produced for any active translation session contains the human-readable language name
  - Tag: `// Feature: noise-robust-transcription, Property 9: Auto-translate status includes speaker language name`
  - **Validates: Requirements 4.2**

- [ ] 10. Checkpoint — Ensure all tests pass, ask the user if questions arise.
