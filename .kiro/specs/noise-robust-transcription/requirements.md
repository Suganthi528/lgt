# Requirements Document

## Introduction

VideoMeet Pro uses Groq's Whisper large-v3 model for real-time speech transcription and Llama 3.3 for translation during video meetings. Two problems exist today:

1. **Background noise degrades transcription accuracy** — the VAD (Voice Activity Detection) thresholds and audio pre-processing are not tuned for noisy environments, causing missed speech, hallucinations, and garbled transcriptions.
2. **Participant language preference is not reliably propagated** — the language a participant selects on the Join/Create Room form is stored on the server, but the Whisper transcription call never receives a `language` hint, so Whisper auto-detects the spoken language and can misidentify it, leading to wrong-language transcriptions and incorrect translations.

This spec covers improvements to both the client-side audio pipeline and the server-side transcription/translation logic to address these two issues.

## Glossary

- **VAD**: Voice Activity Detection — the algorithm that decides when a participant is speaking vs. silent.
- **RMS**: Root Mean Square — a measure of audio signal amplitude used for VAD.
- **Whisper**: OpenAI's speech-to-text model, accessed here via Groq's API (`whisper-large-v3`).
- **Hallucination**: A false transcription produced by Whisper when given silence or very short audio, e.g. "Thank you.", "[Music]".
- **Speaker language**: The language the participant is actually speaking (source language for transcription).
- **Translation language**: The language a participant wants to receive translations in (target language).
- **Groq**: The AI inference provider used for both Whisper transcription and Llama translation.
- **Continuous-audio pipeline**: The VAD-driven recording loop in `VideoCall.js` that captures speech chunks and sends them to the server via the `continuous-audio` socket event.
- **AudioContext**: The Web Audio API object used for real-time audio analysis on the client.
- **High-pass filter**: A filter that removes low-frequency noise (hum, rumble) below a cutoff frequency.
- **Noise gate**: A signal processing technique that mutes audio below a threshold amplitude.
- **Pre-emphasis**: A filter that boosts high frequencies to improve speech intelligibility before transcription.

---

## Requirements

### Requirement 1

**User Story:** As a meeting participant, I want my speech to be transcribed accurately even when there is background noise (keyboard typing, fan noise, ambient room noise), so that other participants receive correct translations.

#### Acceptance Criteria

1. WHEN a participant speaks with background noise present, THE System SHALL apply a high-pass filter with a cutoff of at least 100 Hz to the audio stream before VAD analysis to remove low-frequency noise.
2. WHEN the VAD detects a speech onset, THE System SHALL require the RMS level to exceed a configurable speech threshold for at least 3 consecutive VAD poll intervals before starting a recording chunk, to prevent false triggers from transient noise spikes.
3. WHEN a speech chunk is assembled, THE System SHALL reject chunks shorter than 600 milliseconds before sending to the transcription API, to avoid sending noise-only fragments.
4. WHEN the server receives an audio chunk for transcription, THE System SHALL pass a `prompt` parameter to the Whisper API containing the last confirmed transcription sentence (if available) to improve contextual accuracy.
5. WHEN Whisper returns a transcription, THE System SHALL apply an expanded hallucination filter that rejects single-word outputs matching a list of at least 20 common Whisper silence artifacts before broadcasting the result.
6. WHEN a participant's microphone audio level is consistently below the silence threshold for more than 5 seconds while translation is enabled, THE System SHALL display a "No speech detected — check your microphone" status message to that participant.

---

### Requirement 2

**User Story:** As a meeting participant, I want the system to correctly identify the language I am speaking so that transcription uses the right language model configuration, so that I receive accurate text even when speaking a non-English language.

#### Acceptance Criteria

1. WHEN a participant joins a room, THE System SHALL store the participant's selected spoken language (speaker language) separately from their translation target language in the server-side participant record.
2. WHEN a participant sends a `continuous-audio` event, THE System SHALL include the participant's stored speaker language code in the Whisper transcription API call as the `language` parameter.
3. WHEN the Whisper API is called with an explicit `language` parameter, THE System SHALL log the language code used so that transcription language selection can be verified during debugging.
4. WHEN a participant changes their speaker language during an active meeting, THE System SHALL emit an `update-language` socket event to the server, and THE System SHALL update the participant's stored language preference immediately without requiring a room rejoin.
5. WHEN the Join Room and Create Room forms are submitted, THE System SHALL present two distinct language selectors: one labeled "I will speak in" (speaker language) and one labeled "Translate incoming speech to" (translation language), so that participants can configure both independently.

---

### Requirement 3

**User Story:** As a meeting participant, I want the audio capture pipeline to adapt to varying noise levels in my environment, so that the system does not cut off the beginning or end of my sentences.

#### Acceptance Criteria

1. WHEN the VAD transitions from silence to speech, THE System SHALL begin recording 200 milliseconds before the detected speech onset (pre-roll buffer) to capture the beginning of words that may have been clipped.
2. WHEN the VAD transitions from speech to silence, THE System SHALL continue recording for a configurable silence gap of at least 1000 milliseconds (increased from the current 800 ms) before cutting the chunk, to avoid splitting sentences mid-utterance.
3. WHEN background noise causes the RMS to fluctuate near the speech threshold, THE System SHALL use hysteresis — requiring the RMS to drop below a silence threshold that is at least 30% lower than the speech onset threshold — to prevent rapid start/stop toggling.
4. WHEN a speech chunk exceeds 12 seconds, THE System SHALL split the chunk and send the first portion immediately while continuing to record the remainder, so that long utterances are not delayed.

---

### Requirement 4

**User Story:** As a meeting participant, I want to see which language is being used for my transcription and translation in the meeting UI, so that I can verify the settings are correct before speaking.

#### Acceptance Criteria

1. WHEN a participant is in an active meeting, THE System SHALL display the participant's current speaker language and translation language in the translation control area of the video call UI.
2. WHEN auto-translate is active, THE System SHALL show a status indicator that includes the speaker language name (e.g. "🎤 Speaking: Hindi → Translating to: English").
3. WHEN a transcription result is displayed in the translations panel, THE System SHALL show the detected/used source language alongside the original text so participants can confirm the correct language was identified.
4. WHEN a participant receives a translation from another participant, THE System SHALL display the speaker's name and their source language in the translation card.
