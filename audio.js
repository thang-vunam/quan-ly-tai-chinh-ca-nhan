/* ==========================================================================
   Focus Studio - Web Audio API Synthesizer (100% Offline Audio Engine)
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.ambientNodes = {
      rain: null,
      waves: null,
      forest: null,
      pinkNoise: null
    };
    this.masterGain = null;
    this.isMuted = false;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /* ------------------------------------------------------------------------
     Alarm Sound Generators
     ------------------------------------------------------------------------ */
  playAlarm(type = 'chime') {
    this.initContext();

    switch (type) {
      case 'digital':
        this._playDigitalBeep();
        break;
      case 'gong':
        this._playGong();
        break;
      case 'chime':
      default:
        this._playChime();
        break;
    }
  }

  _playChime() {
    const now = this.ctx.currentTime;
    const notes = [659.25, 880.00, 1174.66]; // E5, A5, D6

    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.15);

      gain.gain.setValueAtTime(0, now + index * 0.15);
      gain.gain.linearRampToValueAtTime(0.3, now + index * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + index * 0.15);
      osc.stop(now + index * 0.15 + 1.3);
    });
  }

  _playDigitalBeep() {
    const now = this.ctx.currentTime;
    [0, 0.2, 0.4].forEach(delay => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1046.50, now + delay); // C6

      gain.gain.setValueAtTime(0.15, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    });
  }

  _playGong() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(130.81, now); // C3
    osc.frequency.exponentialRampToValueAtTime(125, now + 2.5);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 3.0);
  }

  /* ------------------------------------------------------------------------
     Ambient Sound Generators (Procedural Noise Synthesis)
     ------------------------------------------------------------------------ */
  setAmbientVolume(soundKey, volumePercent) {
    this.initContext();

    const vol = (volumePercent / 100) * 0.4;

    if (!this.ambientNodes[soundKey]) {
      if (vol > 0) {
        this._createAmbientSource(soundKey);
      } else {
        return;
      }
    }

    const node = this.ambientNodes[soundKey];
    if (node && node.gainNode) {
      node.gainNode.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }
  }

  _createAmbientSource(soundKey) {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate White Noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0;

    let filterNode;

    switch (soundKey) {
      case 'rain':
        filterNode = this.ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 1000;
        break;

      case 'waves':
        filterNode = this.ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 400;

        // LFO for wave modulation
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.12; // 8 second wave cycle
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 300;
        lfo.connect(lfoGain);
        lfoGain.connect(filterNode.frequency);
        lfo.start();
        break;

      case 'forest':
        filterNode = this.ctx.createBiquadFilter();
        filterNode.type = 'bandpass';
        filterNode.frequency.value = 600;
        filterNode.Q.value = 3.0;
        break;

      case 'pinkNoise':
      default:
        filterNode = this.ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 800;
        break;
    }

    whiteNoise.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.masterGain);

    whiteNoise.start();

    this.ambientNodes[soundKey] = {
      source: whiteNoise,
      gainNode: gainNode
    };
  }

  stopAllAmbient() {
    Object.keys(this.ambientNodes).forEach(key => {
      if (this.ambientNodes[key] && this.ambientNodes[key].gainNode) {
        this.ambientNodes[key].gainNode.gain.setTargetAtTime(0, this.ctx ? this.ctx.currentTime : 0, 0.1);
      }
    });
  }
}

// Global Sound Engine Instance
window.soundEngine = new SoundEngine();
