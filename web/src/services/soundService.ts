import { AlarmSoundItem } from '../types';

// Preset Gentle Instrumental Alarm Sounds (بدون کلام و بسیار آرامش‌بخش)
export const PRESET_ALARM_SOUNDS: AlarmSoundItem[] = [
  {
    id: 'serenity',
    title: 'آرامش صبحگاهی',
    description: 'هارپ و گلاکنسپیل پنتاتونیک ملایم و زلال',
    category: 'calm',
    type: 'synth',
    synthPattern: 'serenity',
    durationSeconds: 3.5,
  },
  {
    id: 'spring-sprout',
    title: 'جوانه بهار',
    description: 'ماریمبا و زنگوله‌های لطیف و باطراوت',
    category: 'nature',
    type: 'synth',
    synthPattern: 'spring-sprout',
    durationSeconds: 3.8,
  },
  {
    id: 'zen-bell',
    title: 'کاسه تبتی و زنگ ذن',
    description: 'طنین مدیتیشن با هارمونیک‌های عمیق ۴۳۲ هرتز',
    category: 'zen',
    type: 'synth',
    synthPattern: 'zen-bell',
    durationSeconds: 4.5,
  },
  {
    id: 'gentle-piano',
    title: 'پیانوی ملایم',
    description: 'آکوردهای گرم و آرامش‌بخش پیانوی آکوستیک',
    category: 'calm',
    type: 'synth',
    synthPattern: 'gentle-piano',
    durationSeconds: 4.0,
  },
  {
    id: 'forest-chime',
    title: 'نسیم بیشه‌زار',
    description: 'زنگوله‌های بادی بلورین و نوای باد ملایم',
    category: 'nature',
    type: 'synth',
    synthPattern: 'forest-chime',
    durationSeconds: 3.5,
  },
  {
    id: 'warm-sunrise',
    title: 'طلوع آفتاب',
    description: 'ملودی پرتوهای امیدبخش و شفاف صبحگاهی',
    category: 'chime',
    type: 'synth',
    synthPattern: 'warm-sunrise',
    durationSeconds: 3.6,
  },
];

let globalAudioCtx: AudioContext | null = null;
let currentActiveAudio: HTMLAudioElement | null = null;
let currentSynthStopFns: Array<() => void> = [];
let currentLoopTimerId: number | null = null;
let audioUnlocked = false;
const wavCache = new Map<string, string>();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioContextClass();
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch (err) {
    console.warn('AudioContext initialization deferred until user interaction:', err);
    return null;
  }
}

/**
 * Automatically unlock WebView AudioContext and HTML5 Audio on first user touch/click
 */
export function initAudioUnlockListeners(): void {
  if (typeof window === 'undefined' || audioUnlocked) return;

  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        // Play a 1-sample silent buffer to unlock hardware audio channel on Android WebView
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
      audioUnlocked = true;
    } catch {}
  };

  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

// Initialize unlock listeners immediately on module load
if (typeof window !== 'undefined') {
  initAudioUnlockListeners();
}

export function stopAllAlarmSounds(): void {
  if (currentLoopTimerId !== null && typeof window !== 'undefined') {
    window.clearInterval(currentLoopTimerId);
    currentLoopTimerId = null;
  }

  // Stop HTML5 audio if playing
  if (currentActiveAudio) {
    try {
      currentActiveAudio.pause();
      currentActiveAudio.currentTime = 0;
    } catch {}
    currentActiveAudio = null;
  }

  // Stop synthetic audio voices
  currentSynthStopFns.forEach((stopFn) => {
    try {
      stopFn();
    } catch {}
  });
  currentSynthStopFns = [];

  // Stop vibration if active
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(0);
    }
  } catch {}
}

interface NoteSpec {
  freq: number;
  startOffset: number;
  duration: number;
  type?: OscillatorType;
  secondHarmonic?: boolean;
}

function getPatternNotes(pattern: string): NoteSpec[] {
  switch (pattern) {
    case 'serenity': {
      const notes = [261.63, 329.63, 392.0, 440.0, 523.25, 659.25];
      return notes.map((freq, idx) => ({
        freq,
        startOffset: idx * 0.32,
        duration: 2.0,
        type: 'sine',
        secondHarmonic: true,
      }));
    }
    case 'spring-sprout': {
      const notes = [369.99, 466.16, 554.37, 698.46, 830.61];
      const list: NoteSpec[] = notes.map((freq, idx) => ({
        freq,
        startOffset: idx * 0.26,
        duration: 1.7,
        type: 'triangle',
        secondHarmonic: true,
      }));
      list.push({ freq: 1108.73, startOffset: 1.4, duration: 1.9, type: 'sine', secondHarmonic: true });
      return list;
    }
    case 'zen-bell': {
      const root = 432;
      return [
        { freq: root / 2, startOffset: 0.0, duration: 3.4, type: 'sine', secondHarmonic: false },
        { freq: root, startOffset: 0.05, duration: 3.5, type: 'sine', secondHarmonic: true },
        { freq: root * 1.5, startOffset: 0.35, duration: 3.0, type: 'sine', secondHarmonic: true },
        { freq: root * 2, startOffset: 0.7, duration: 2.6, type: 'sine', secondHarmonic: true },
      ];
    }
    case 'gentle-piano': {
      return [
        { freq: 349.23, startOffset: 0.0, duration: 2.2, type: 'triangle', secondHarmonic: true },
        { freq: 440.0, startOffset: 0.1, duration: 2.2, type: 'sine', secondHarmonic: true },
        { freq: 523.25, startOffset: 0.2, duration: 2.4, type: 'sine', secondHarmonic: true },
        { freq: 659.25, startOffset: 0.3, duration: 2.6, type: 'sine', secondHarmonic: true },
        { freq: 261.63, startOffset: 1.1, duration: 2.4, type: 'triangle', secondHarmonic: true },
        { freq: 392.0, startOffset: 1.25, duration: 2.3, type: 'sine', secondHarmonic: true },
        { freq: 493.88, startOffset: 1.4, duration: 2.4, type: 'sine', secondHarmonic: true },
        { freq: 523.25, startOffset: 1.55, duration: 2.6, type: 'sine', secondHarmonic: true },
      ];
    }
    case 'forest-chime': {
      const chimeFreqs = [587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
      const times = [0.0, 0.22, 0.48, 0.8, 1.15, 1.5];
      return times.map((t, i) => ({
        freq: chimeFreqs[i % chimeFreqs.length],
        startOffset: t,
        duration: 2.0,
        type: 'sine',
        secondHarmonic: true,
      }));
    }
    case 'warm-sunrise':
    default: {
      const notes = [293.66, 369.99, 440.0, 587.33, 739.99];
      return notes.map((freq, i) => ({
        freq,
        startOffset: i * 0.28,
        duration: 2.1,
        type: 'sine',
        secondHarmonic: true,
      }));
    }
  }
}

/**
 * Synthesizes a 16-bit PCM WAV Data URI for Android WebView HTMLAudioElement compatibility.
 * Ensures audio plays through Android's native MediaPlayer pipeline even if Web Audio API is suspended.
 */
function getOrGeneratePatternWavDataUrl(pattern: string): string {
  const cached = wavCache.get(pattern);
  if (cached) return cached;

  const sampleRate = 22050;
  const durationSeconds = 3.6;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const samples = new Float32Array(numSamples);
  const notes = getPatternNotes(pattern);

  for (const note of notes) {
    const startSample = Math.floor(note.startOffset * sampleRate);
    const noteSamples = Math.floor(note.duration * sampleRate);
    const endSample = Math.min(numSamples, startSample + noteSamples);
    const twoPiF = (2 * Math.PI * note.freq) / sampleRate;

    for (let i = startSample; i < endSample; i++) {
      const localIdx = i - startSample;
      const t = localIdx / sampleRate;
      // Soft attack (20ms) and exponential decay
      const attack = t < 0.02 ? t / 0.02 : 1.0;
      const decay = Math.exp((-3.2 * t) / Math.max(0.4, note.duration));
      const env = attack * decay;

      let wave = Math.sin(twoPiF * localIdx) * 0.32;
      if (note.secondHarmonic) {
        wave += Math.sin(twoPiF * 2 * localIdx) * 0.1;
      }
      samples[i] += wave * env;
    }
  }

  // Encode 16-bit mono WAV header + PCM samples
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, 1, true);  // 1 channel (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  const dataUrl = `data:audio/wav;base64,${btoa(binary)}`;
  wavCache.set(pattern, dataUrl);
  return dataUrl;
}

/**
 * Dual-engine procedural acoustic synthesizer (Web Audio API + HTML5 WAV Audio fallback)
 */
function playSynthPatternOnce(pattern: string, volume = 0.8): () => void {
  const clampedVol = Math.max(0.05, Math.min(1.0, Number.isFinite(volume) ? volume : 0.8));
  const stopCallbacks: Array<() => void> = [];

  // 1. HTML5 Audio Element with synthesized PCM WAV (works reliably in Android WebView MediaPlayer)
  try {
    const wavUrl = getOrGeneratePatternWavDataUrl(pattern);
    const audio = new Audio(wavUrl);
    audio.volume = clampedVol;
    currentActiveAudio = audio;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
    stopCallbacks.push(() => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
      if (currentActiveAudio === audio) {
        currentActiveAudio = null;
      }
    });
  } catch (e) {
    console.warn('WAV Audio fallback notice:', e);
  }

  // 2. Web Audio API Synthesizer for rich harmonics
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(clampedVol, now);
      masterGain.connect(ctx.destination);

      const activeNodes: Array<{ stop: (time: number) => void; disconnect: () => void }> = [];
      const notes = getPatternNotes(pattern);

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = n.type || 'sine';
        const startTime = now + n.startOffset;
        osc.frequency.setValueAtTime(n.freq, startTime);

        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(0.45, startTime + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + n.duration);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + n.duration);
        activeNodes.push(osc);

        if (n.secondHarmonic) {
          const overtone = ctx.createOscillator();
          const overGain = ctx.createGain();
          overtone.type = 'sine';
          overtone.frequency.setValueAtTime(n.freq * 2, startTime);
          overGain.gain.setValueAtTime(0.0001, startTime);
          overGain.gain.linearRampToValueAtTime(0.12, startTime + 0.015);
          overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + n.duration * 0.7);

          overtone.connect(overGain);
          overGain.connect(masterGain);
          overtone.start(startTime);
          overtone.stop(startTime + n.duration * 0.7);
          activeNodes.push(overtone);
        }
      });

      stopCallbacks.push(() => {
        try {
          masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
          setTimeout(() => {
            activeNodes.forEach((node) => {
              try {
                node.stop(0);
                node.disconnect();
              } catch {}
            });
          }, 120);
        } catch {}
      });
    }
  } catch (err) {
    console.warn('WebAudio synth error:', err);
  }

  const combinedStop = () => {
    stopCallbacks.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };

  currentSynthStopFns.push(combinedStop);
  return combinedStop;
}

/**
 * Triggers gentle haptic vibration on Android/mobile devices when an alarm rings
 */
export function triggerDeviceVibration(): void {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('javaneh_haptic_feedback') === 'false') {
      return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([350, 150, 350, 150, 500]);
    }
  } catch {}
}

/**
 * Plays the specified alarm sound (built-in synth or user-uploaded audio).
 * Supports flexible call signatures:
 * - playAlarmSound(soundId, volume)
 * - playAlarmSound(soundId, customSoundsArray, volume, loopAlarm)
 * - playAlarmSound(soundId, customDataUrlString, volume, loopAlarm)
 */
export function playAlarmSound(
  soundId: string,
  customSoundsOrVolume?: AlarmSoundItem[] | string | number,
  volumeArg = 0.8,
  loopAlarm = false
): () => void {
  stopAllAlarmSounds();

  let customSounds: AlarmSoundItem[] = [];
  let directDataUrl: string | undefined;
  let volume = volumeArg;

  if (typeof customSoundsOrVolume === 'number') {
    volume = customSoundsOrVolume;
  } else if (typeof customSoundsOrVolume === 'string') {
    directDataUrl = customSoundsOrVolume;
  } else if (Array.isArray(customSoundsOrVolume)) {
    customSounds = customSoundsOrVolume;
  }

  const clampedVol = Math.max(0.05, Math.min(1.0, Number.isFinite(volume) ? volume : 0.8));

  // Trigger vibration on alarm
  if (loopAlarm) {
    triggerDeviceVibration();
  }

  // 1. Check custom uploaded sounds
  const custom = Array.isArray(customSounds) ? customSounds.find((s) => s.id === soundId) : undefined;
  const customAudioSrc = directDataUrl || custom?.dataUrl || custom?.audioData;

  if (customAudioSrc) {
    try {
      const audio = new Audio(customAudioSrc);
      audio.volume = clampedVol;
      audio.loop = loopAlarm;
      currentActiveAudio = audio;
      audio.play().catch((err) => {
        console.warn('Custom audio play failed, falling back to preset:', err);
        playSynthPatternOnce('serenity', clampedVol);
      });
      return () => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
        if (currentActiveAudio === audio) {
          currentActiveAudio = null;
        }
      };
    } catch (e) {
      console.error('Custom sound playback failed, falling back to preset', e);
    }
  }

  // 2. Preset sounds
  const preset = PRESET_ALARM_SOUNDS.find((s) => s.id === soundId) || PRESET_ALARM_SOUNDS[0];
  const pattern = preset.synthPattern || 'serenity';

  playSynthPatternOnce(pattern, clampedVol);

  // If this is a real-time alarm (loopAlarm = true), repeat the gentle chime up to 8 times (approx 32s) until dismissed
  if (loopAlarm && typeof window !== 'undefined') {
    let repeatCount = 0;
    currentLoopTimerId = window.setInterval(() => {
      repeatCount += 1;
      if (repeatCount >= 8) {
        if (currentLoopTimerId !== null) {
          window.clearInterval(currentLoopTimerId);
          currentLoopTimerId = null;
        }
        return;
      }
      triggerDeviceVibration();
      playSynthPatternOnce(pattern, clampedVol);
    }, 4200);
  }

  return () => {
    stopAllAlarmSounds();
  };
}

/**
 * Helper to test/preview a sound briefly (single cycle)
 */
export function previewSound(
  soundId: string,
  customSoundsOrDataUrl?: AlarmSoundItem[] | string | number,
  volume = 0.8
): () => void {
  return playAlarmSound(soundId, customSoundsOrDataUrl, volume, false);
}
