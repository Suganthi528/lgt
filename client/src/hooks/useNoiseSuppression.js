import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useNoiseSuppression
 *
 * Integrates RNNoise (via @jitsi/rnnoise-wasm) as an AudioWorklet processor
 * to remove background noise from a MediaStream before it is used for
 * transcription or WebRTC transmission.
 *
 * Returns:
 *  - isSupported        : boolean — AudioWorklet + WASM available in this browser
 *  - isEnabled          : boolean — noise suppression currently active
 *  - isLoading          : boolean — WASM module loading
 *  - processStream(stream) → Promise<MediaStream> — returns a denoised stream
 *  - toggleNoiseSuppression() — enable/disable
 *  - cleanup()          — release all AudioContext resources
 */
export function useNoiseSuppression() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const rnnoiseRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const destinationRef = useRef(null);
  const processedStreamRef = useRef(null);

  // Check browser support on mount
  useEffect(() => {
    const supported =
      typeof AudioContext !== 'undefined' &&
      typeof AudioWorkletNode !== 'undefined' &&
      typeof WebAssembly !== 'undefined';
    setIsSupported(supported);
    if (!supported) {
      console.warn('⚠️ Noise suppression not supported in this browser (requires AudioWorklet + WASM)');
    }
  }, []);

  const loadRNNoise = useCallback(async () => {
    if (rnnoiseRef.current) return rnnoiseRef.current;
    try {
      // Dynamic import of @jitsi/rnnoise-wasm
      const RNNoiseModule = await import('@jitsi/rnnoise-wasm');
      const rnnoise = await RNNoiseModule.default();
      rnnoiseRef.current = rnnoise;
      console.log('✅ RNNoise WASM loaded');
      return rnnoise;
    } catch (e) {
      console.error('❌ Failed to load RNNoise WASM:', e);
      throw e;
    }
  }, []);

  /**
   * processStream — wraps a MediaStream with noise suppression.
   * Returns a new MediaStream with the denoised audio track.
   * Video tracks are passed through unchanged.
   */
  const processStream = useCallback(async (inputStream) => {
    if (!isSupported || !isEnabled) {
      return inputStream;
    }

    const audioTracks = inputStream.getAudioTracks();
    if (audioTracks.length === 0) {
      return inputStream;
    }

    try {
      setIsLoading(true);

      // Load RNNoise WASM
      const rnnoise = await loadRNNoise();

      // Create AudioContext at 48kHz (required by RNNoise)
      if (audioContextRef.current) {
        try { await audioContextRef.current.close(); } catch (e) {}
      }
      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Register the AudioWorklet processor
      await audioContext.audioWorklet.addModule('/noise-suppression-processor.js');

      // Create nodes
      const micStream = new MediaStream([audioTracks[0]]);
      const sourceNode = audioContext.createMediaStreamSource(micStream);
      sourceNodeRef.current = sourceNode;

      const workletNode = new AudioWorkletNode(audioContext, 'noise-suppressor-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: {}
      });
      workletNodeRef.current = workletNode;

      // Send WASM module to worklet
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Worklet init timeout')), 5000);
        workletNode.port.onmessage = (e) => {
          if (e.data.type === 'initialized') {
            clearTimeout(timeout);
            resolve();
          } else if (e.data.type === 'error') {
            clearTimeout(timeout);
            reject(new Error(e.data.message));
          }
        };
        workletNode.port.postMessage({ type: 'init', wasmModule: rnnoise });
      });

      // Route: mic → worklet → destination
      const destination = audioContext.createMediaStreamDestination();
      destinationRef.current = destination;

      sourceNode.connect(workletNode);
      workletNode.connect(destination);

      // Build output stream: denoised audio + original video tracks
      const denoisedStream = new MediaStream();
      destination.stream.getAudioTracks().forEach(t => denoisedStream.addTrack(t));
      inputStream.getVideoTracks().forEach(t => denoisedStream.addTrack(t));

      processedStreamRef.current = denoisedStream;

      console.log('🎙️ Noise suppression pipeline active');
      setIsLoading(false);
      return denoisedStream;

    } catch (error) {
      console.error('❌ Noise suppression setup failed, falling back to raw stream:', error);
      setIsLoading(false);
      // Graceful fallback — return original stream
      return inputStream;
    }
  }, [isSupported, isEnabled, loadRNNoise]);

  const cleanup = useCallback(() => {
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.port.postMessage({ type: 'destroy' });
        workletNodeRef.current.disconnect();
      } catch (e) {}
      workletNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    processedStreamRef.current = null;
    console.log('🧹 Noise suppression pipeline cleaned up');
  }, []);

  const toggleNoiseSuppression = useCallback(() => {
    setIsEnabled(prev => {
      const next = !prev;
      console.log(`🎙️ Noise suppression ${next ? 'enabled' : 'disabled'}`);
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    isSupported,
    isEnabled,
    isLoading,
    processStream,
    toggleNoiseSuppression,
    cleanup
  };
}
