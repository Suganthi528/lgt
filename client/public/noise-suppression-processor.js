/**
 * AudioWorklet processor for RNNoise-based noise suppression.
 * Runs in the audio rendering thread for low-latency processing.
 * Communicates with the main thread via MessagePort to receive
 * the WASM module and processed audio frames.
 */
class NoiseSuppressorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._initialized = false;
    this._rnnoise = null;
    this._denoiseState = null;
    this._frameSize = 480; // RNNoise requires exactly 480 samples per frame @ 48kHz
    this._inputBuffer = new Float32Array(0);

    this.port.onmessage = (event) => {
      if (event.data.type === 'init') {
        this._initRNNoise(event.data.wasmModule);
      } else if (event.data.type === 'destroy') {
        this._destroy();
      }
    };
  }

  _initRNNoise(wasmModule) {
    try {
      this._rnnoise = wasmModule;
      this._denoiseState = this._rnnoise.newState();
      this._initialized = true;
      this.port.postMessage({ type: 'initialized' });
    } catch (e) {
      this.port.postMessage({ type: 'error', message: e.message });
    }
  }

  _destroy() {
    if (this._rnnoise && this._denoiseState) {
      try {
        this._rnnoise.deleteState(this._denoiseState);
      } catch (e) {}
      this._denoiseState = null;
    }
    this._initialized = false;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const inputChannel = input[0];
    const outputChannel = output[0];

    if (!this._initialized || !this._rnnoise || !this._denoiseState) {
      // Pass through unprocessed if not ready
      outputChannel.set(inputChannel);
      return true;
    }

    // Accumulate input samples
    const combined = new Float32Array(this._inputBuffer.length + inputChannel.length);
    combined.set(this._inputBuffer);
    combined.set(inputChannel, this._inputBuffer.length);
    this._inputBuffer = combined;

    let outputOffset = 0;
    const processedOutput = new Float32Array(combined.length);

    // Process in 480-sample frames
    while (this._inputBuffer.length >= this._frameSize) {
      const frame = this._inputBuffer.slice(0, this._frameSize);
      this._inputBuffer = this._inputBuffer.slice(this._frameSize);

      // RNNoise expects samples in [-32768, 32767] range (int16 scale)
      const scaledFrame = new Float32Array(this._frameSize);
      for (let i = 0; i < this._frameSize; i++) {
        scaledFrame[i] = frame[i] * 32768;
      }

      try {
        this._rnnoise.processFrame(this._denoiseState, scaledFrame, scaledFrame);
      } catch (e) {
        // On error, pass through original
        for (let i = 0; i < this._frameSize; i++) {
          scaledFrame[i] = frame[i] * 32768;
        }
      }

      // Scale back to [-1, 1]
      for (let i = 0; i < this._frameSize; i++) {
        processedOutput[outputOffset + i] = scaledFrame[i] / 32768;
      }
      outputOffset += this._frameSize;
    }

    // Copy processed samples to output
    const copyLength = Math.min(outputChannel.length, outputOffset);
    outputChannel.set(processedOutput.slice(0, copyLength));

    // Fill remainder with silence if needed
    for (let i = copyLength; i < outputChannel.length; i++) {
      outputChannel[i] = 0;
    }

    return true;
  }
}

registerProcessor('noise-suppressor-processor', NoiseSuppressorProcessor);
