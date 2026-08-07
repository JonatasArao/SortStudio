import { CustomAudio } from "../types";
import { useAppStore } from "../store/useAppStore";

// --- SERVIÇO DE ÁUDIO (Web Audio API) ---
const audioCtx =
  typeof window !== "undefined"
    ? new (window.AudioContext || (window as any).webkitAudioContext)()
    : null;

const setupClipping = (audio: HTMLAudioElement, startTime?: number, endTime?: number) => {
  if (startTime !== undefined) {
    audio.currentTime = startTime;
  }
  if (endTime !== undefined) {
    const checkEnd = () => {
      if (audio.currentTime >= endTime) {
        audio.pause();
        audio.removeEventListener('timeupdate', checkEnd);
      }
    };
    audio.addEventListener('timeupdate', checkEnd);
  }
};

export const playTickSound = (
  baseVolume = 0.5,
  type = "click",
  customAudio: CustomAudio | null = null,
  masterVolume = 1,
) => {
  if (masterVolume === 0) return;
  
  if (customAudio && customAudio.audioObj) {
    const obj = customAudio.audioObj;
    const finalVol = (customAudio.volume !== undefined ? customAudio.volume / 100 : 1) * masterVolume;
    
    // Check if it's our YouTubeAudio class (has destroy/play methods but not instanceof HTMLAudioElement)
    if (typeof obj.play === 'function' && !(obj instanceof HTMLAudioElement)) {
      if (customAudio.startTime !== undefined) obj.startTime = customAudio.startTime;
      if (customAudio.endTime !== undefined) obj.endTime = customAudio.endTime;
      obj.volume = finalVol;
      obj.play();
    } else if (obj instanceof HTMLAudioElement) {
      const clone = obj.cloneNode() as HTMLAudioElement;
      clone.volume = Math.min(finalVol * 1.5, 1);
      setupClipping(clone, customAudio.startTime, customAudio.endTime);
      clone.play().catch(() => {});
    }
    return;
  }

  const volume = baseVolume * masterVolume;
  const knownTickTypes = ["click", "beep", "pop", "madeira", "metal", "synth", "drum", "bambu", "vidro"];
  if (!knownTickTypes.includes(type) || volume === 0 || !audioCtx) return;

  if (audioCtx.state === "suspended") audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  let finalVolume = volume;
  if (type === "beep") {
    osc.type = "square";
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    finalVolume = volume * 0.3;
  } else if (type === "pop") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  } else if (type === "madeira") {
    osc.type = "square";
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    finalVolume = volume * 0.4;
  } else if (type === "metal") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
  } else if (type === "synth") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    finalVolume = volume * 0.2;
  } else if (type === "drum") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    finalVolume = volume * 0.8;
  } else if (type === "bambu") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(450, audioCtx.currentTime);
  } else if (type === "vidro") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(2000, audioCtx.currentTime);
    finalVolume = volume * 0.3;
  } else {
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  }

  gain.gain.setValueAtTime(finalVolume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
};

let activeWinAudio: any = null;

export const playWinSound = (
  baseVolume = 0.6,
  type = "tada",
  customAudioParam: any = null,
  masterVolume = 1,
) => {
  if (masterVolume === 0) return;

  if (activeWinAudio) {
    try {
      activeWinAudio.pause();
      if (activeWinAudio.currentTime !== undefined) activeWinAudio.currentTime = 0;
    } catch (_) {}
    activeWinAudio = null;
  }

  let customAudio: CustomAudio | null = null;
  let audioObj: any = null;

  if (customAudioParam) {
    if (customAudioParam.audioObj) {
      customAudio = customAudioParam as CustomAudio;
      audioObj = customAudioParam.audioObj;
    } else {
      audioObj = customAudioParam;
    }
  }

  if (!audioObj && type) {
    try {
      const storeState = useAppStore.getState();
      const found = storeState.customWinAudios?.find((a) => a.id === type);
      if (found) {
        customAudio = found;
        audioObj = found.audioObj;
      }
    } catch (_) {}
  }

  if (audioObj) {
    const customVol = customAudio && customAudio.volume !== undefined ? customAudio.volume / 100 : 1;
    const finalVol = baseVolume * masterVolume * customVol;
    const startTime = customAudio?.startTime;
    const endTime = customAudio?.endTime;

    if (typeof audioObj.play === 'function' && !(audioObj instanceof HTMLAudioElement)) {
      if (startTime !== undefined) audioObj.startTime = startTime;
      if (endTime !== undefined) audioObj.endTime = endTime;
      audioObj.volume = finalVol;
      audioObj.play();
      activeWinAudio = audioObj;
    } else if (audioObj instanceof HTMLAudioElement) {
      const clone = audioObj.cloneNode() as HTMLAudioElement;
      clone.volume = Math.min(finalVol * 1.5, 1);
      setupClipping(clone, startTime, endTime);
      clone.play().catch(() => {});
      activeWinAudio = clone;
    }
    return;
  }

  const mixkitMap: Record<string, string> = {
    "aplausos-suaves": "https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3",
    "aplausos-fortes": "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3",
    trombeta: "https://assets.mixkit.co/active_storage/sfx/2598/2598-preview.mp3",
    "sino-vitoria": "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
    surpresa: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3",
  };

  const volume = baseVolume * masterVolume;

  if (mixkitMap[type]) {
    const audio = new Audio(mixkitMap[type]);
    audio.volume = volume;
    audio.play().catch(() => {});
    activeWinAudio = audio;
    return;
  }

  const knownTypes = ["tada", "fanfarra", "sino", "harpa", "magia", "orquestra"];
  if (!knownTypes.includes(type) || volume === 0 || !audioCtx) return;

  if (audioCtx.state === "suspended") audioCtx.resume();
  let frequencies = [523.25, 659.25, 783.99, 1046.5];
  let waveType: OscillatorType = "triangle";
  let finalVolume = volume;

  if (type === "fanfarra") {
    frequencies = [440, 554.37, 659.25, 880];
    waveType = "square";
    finalVolume = volume * 0.3;
  } else if (type === "sino") {
    frequencies = [1046.5, 1318.51, 1567.98];
    waveType = "sine";
  } else if (type === "harpa") {
    frequencies = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    waveType = "sine";
    finalVolume = volume * 0.5;
  } else if (type === "magia") {
    frequencies = [1046.5, 1567.98, 2093.0, 3135.96];
    waveType = "sine";
    finalVolume = volume * 0.3;
  } else if (type === "orquestra") {
    frequencies = [261.63, 329.63, 392.0, 523.25];
    waveType = "square";
    finalVolume = volume * 0.2;
  }

  frequencies.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = waveType;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    const speed = type === "harpa" ? 0.05 : 0.1;
    const sustain = type === "harpa" ? 0.5 : 1.5;
    gain.gain.linearRampToValueAtTime(finalVolume, audioCtx.currentTime + speed + i * speed);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + sustain + i * speed);
    osc.start(audioCtx.currentTime + i * speed);
    osc.stop(audioCtx.currentTime + sustain + i * speed);
  });
};

export const playFailureSound = (masterVolume = 1, type: string = "failure", customAudioParam: any = null) => {
  if (masterVolume === 0) return;
  if (activeWinAudio) {
    try {
      activeWinAudio.pause();
      if (activeWinAudio.currentTime !== undefined) activeWinAudio.currentTime = 0;
    } catch (_) {}
    activeWinAudio = null;
  }

  let customAudio: CustomAudio | null = null;
  let audioObj: any = null;

  if (customAudioParam) {
    if (customAudioParam.audioObj) {
      customAudio = customAudioParam as CustomAudio;
      audioObj = customAudioParam.audioObj;
    } else {
      audioObj = customAudioParam;
    }
  }

  if (!audioObj && type) {
    try {
      const storeState = useAppStore.getState();
      const found = storeState.customWinAudios?.find((a) => a.id === type);
      if (found) {
        customAudio = found;
        audioObj = found.audioObj;
      }
    } catch (_) {}
  }

  if (audioObj) {
    const customVol = customAudio && customAudio.volume !== undefined ? customAudio.volume / 100 : 1;
    const finalVol = masterVolume * customVol;
    const startTime = customAudio?.startTime;
    const endTime = customAudio?.endTime;

    if (typeof audioObj.play === 'function' && !(audioObj instanceof HTMLAudioElement)) {
      if (startTime !== undefined) audioObj.startTime = startTime;
      if (endTime !== undefined) audioObj.endTime = endTime;
      audioObj.volume = finalVol;
      audioObj.play();
      activeWinAudio = audioObj;
    } else if (audioObj instanceof HTMLAudioElement) {
      const clone = audioObj.cloneNode() as HTMLAudioElement;
      clone.volume = finalVol;
      setupClipping(clone, startTime, endTime);
      clone.play().catch(() => {});
      activeWinAudio = clone;
    }
    return;
  }

  let audioUrl = "https://assets.mixkit.co/active_storage/sfx/2834/2834-preview.mp3";
  if (type === "sad_trombone") {
    audioUrl = "https://assets.mixkit.co/active_storage/sfx/2974/2974-preview.mp3";
  } else if (type === "buzzer") {
    audioUrl = "https://assets.mixkit.co/active_storage/sfx/2828/2828-preview.mp3";
  }

  const audio = new Audio(audioUrl);
  audio.volume = masterVolume;
  audio.play().catch(() => {});
  activeWinAudio = audio;
};

export const stopWinSound = () => {
  if (activeWinAudio) {
    try {
      activeWinAudio.pause();
      if (activeWinAudio.currentTime !== undefined) activeWinAudio.currentTime = 0;
    } catch (_) {}
    activeWinAudio = null;
  }
};

export const playStartLightBeep = (lightIndex: number, masterVolume = 1) => {
  if (masterVolume === 0 || !audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  // Classic motorsport start light beep
  osc.frequency.setValueAtTime(1000, audioCtx.currentTime);

  const vol = 0.15 * masterVolume;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

  // Add lowpass filter to make it less harsh
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3000, audioCtx.currentTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
};

export const playLightsOutGoSound = (masterVolume = 1) => {
  if (masterVolume === 0 || !audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  // High pitch GO signal
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1500, audioCtx.currentTime);

  const vol = 0.2 * masterVolume;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

  const toneFilter = audioCtx.createBiquadFilter();
  toneFilter.type = "lowpass";
  toneFilter.frequency.setValueAtTime(4000, audioCtx.currentTime);

  osc.connect(toneFilter);
  toneFilter.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);

  // Engine launch rumble noise burst
  try {
    const bufferSize = audioCtx.sampleRate * 0.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, audioCtx.currentTime + 0.5);

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.25 * masterVolume, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    noise.start();
  } catch (_) {}
};

const makeDistortionCurve = (amount: number) => {
  const k = typeof amount === "number" ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  let max = 0;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    if (Math.abs(curve[i]) > max) max = Math.abs(curve[i]);
  }
  if (max > 0) {
    for (let i = 0; i < n_samples; ++i) {
      curve[i] /= max;
    }
  }
  return curve;
};

export const playEngineRevBeep = (intensity = 0.5, masterVolume = 1) => {
  if (masterVolume === 0 || !audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  // Simulated engine rev
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  const distortion = audioCtx.createWaveShaper();
  distortion.curve = makeDistortionCurve(30);
  
  // Create a custom waveform that sounds like a combustion engine (richer harmonics)
  const real = new Float32Array(32);
  const imag = new Float32Array(32);
  real[1] = 1.0;
  real[2] = 0.6;
  real[3] = 0.1;
  real[4] = 0.4;
  real[5] = 0.1;
  real[6] = 0.2;
  real[8] = 0.3;
  for (let i = 9; i < 32; i++) {
    real[i] = (Math.random() * 0.1) / (i * 0.5);
  }
  const engineWave = audioCtx.createPeriodicWave(real, imag);

  osc1.setPeriodicWave(engineWave);
  osc2.type = "triangle";
  
  const baseFreq = 30 + intensity * 40; // 30 to 70Hz base for rev
  osc1.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(baseFreq * 2.0, audioCtx.currentTime + 0.15);
  
  osc2.frequency.setValueAtTime(baseFreq * 0.5, audioCtx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.0, audioCtx.currentTime + 0.15);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(400, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.15);

  const vol = 0.15 * masterVolume;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

  osc1.connect(distortion);
  osc2.connect(distortion);
  distortion.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc1.start();
  osc2.start();
  osc1.stop(audioCtx.currentTime + 0.25);
  osc2.stop(audioCtx.currentTime + 0.25);
};

export const getAudioCtx = () => audioCtx;

// --- RACE AUDIO ENGINE (ENGINE DOPPLER, TIRE SQUEAL, KERB IMPACT) ---

let raceEngineOsc1: OscillatorNode | null = null;
let raceEngineOsc2: OscillatorNode | null = null;
let raceEngineOsc3: OscillatorNode | null = null;
let raceEngineGain: GainNode | null = null;
let raceEngineFilter: BiquadFilterNode | null = null;
let raceEngineDistortion: WaveShaperNode | null = null;

let tireSquealNoise: AudioBufferSourceNode | null = null;
let tireSquealGain: GainNode | null = null;
let tireSquealFilter: BiquadFilterNode | null = null;

let lastDistToCam: number | null = null;
let lastKerbSoundTime = 0;

/**
 * Initializes continuous race audio synthesis (engine sound & tire squeal).
 */
export const initRaceAudioNodes = () => {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  if (!raceEngineGain) {
    try {
      // 1. Engine Synth setup (layered custom periodic waves + sub square + distortion)
      raceEngineGain = audioCtx.createGain();
      raceEngineGain.gain.setValueAtTime(0, audioCtx.currentTime);

      raceEngineDistortion = audioCtx.createWaveShaper();
      raceEngineDistortion.curve = makeDistortionCurve(10); // Less harsh distortion
      raceEngineDistortion.oversample = '4x';

      raceEngineFilter = audioCtx.createBiquadFilter();
      raceEngineFilter.type = "lowpass";
      raceEngineFilter.Q.value = 2.0; // More resonance for throatier tone
      raceEngineFilter.frequency.setValueAtTime(1200, audioCtx.currentTime);

      // Create a custom waveform that sounds like a combustion engine (richer harmonics)
      const real = new Float32Array(32);
      const imag = new Float32Array(32);
      real[1] = 1.0;
      real[2] = 0.6;
      real[3] = 0.1;
      real[4] = 0.4;
      real[5] = 0.1;
      real[6] = 0.2;
      real[8] = 0.3;
      for (let i = 9; i < 32; i++) {
        real[i] = (Math.random() * 0.1) / (i * 0.5);
      }
      const engineWave = audioCtx.createPeriodicWave(real, imag);

      raceEngineOsc1 = audioCtx.createOscillator();
      raceEngineOsc1.setPeriodicWave(engineWave);

      raceEngineOsc2 = audioCtx.createOscillator();
      raceEngineOsc2.setPeriodicWave(engineWave); // Use same wave for detuned layer

      raceEngineOsc3 = audioCtx.createOscillator();
      raceEngineOsc3.type = "triangle"; // Triangle instead of square for smoother low end

      raceEngineOsc1.connect(raceEngineDistortion);
      raceEngineOsc2.connect(raceEngineDistortion);
      raceEngineOsc3.connect(raceEngineDistortion);
      
      raceEngineDistortion.connect(raceEngineFilter);
      raceEngineFilter.connect(raceEngineGain);
      raceEngineGain.connect(audioCtx.destination);

      raceEngineOsc1.start();
      raceEngineOsc2.start();
      raceEngineOsc3.start();
    } catch (_) {}
  }

  if (!tireSquealGain) {
    try {
      // 2. Tire Squeal setup (Filtered noise)
      const bufferSize = audioCtx.sampleRate * 2.0;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      tireSquealNoise = audioCtx.createBufferSource();
      tireSquealNoise.buffer = buffer;
      tireSquealNoise.loop = true;

      tireSquealFilter = audioCtx.createBiquadFilter();
      tireSquealFilter.type = "bandpass";
      tireSquealFilter.frequency.setValueAtTime(2200, audioCtx.currentTime);
      tireSquealFilter.Q.setValueAtTime(8.0, audioCtx.currentTime);

      tireSquealGain = audioCtx.createGain();
      tireSquealGain.gain.setValueAtTime(0, audioCtx.currentTime);

      tireSquealNoise.connect(tireSquealFilter);
      tireSquealFilter.connect(tireSquealGain);
      tireSquealGain.connect(audioCtx.destination);

      tireSquealNoise.start();
    } catch (_) {}
  }
};

/**
 * Updates 3D engine audio with Doppler pitch shift & proximity attenuation.
 */
export const updateRaceEngineAudio = (
  speedKmh: number,
  distToCam: number,
  cameraMode: string,
  deltaTime: number,
  masterVolume = 1.0,
  isRacing = true
) => {
  if (!audioCtx || masterVolume === 0 || !isRacing) {
    stopRaceAudio();
    return;
  }

  initRaceAudioNodes();
  if (!raceEngineGain || !raceEngineOsc1 || !raceEngineOsc2 || !raceEngineOsc3 || !raceEngineFilter) return;

  const now = audioCtx.currentTime;

  // Calculate rate of distance change (m/s)
  let rateOfChange = 0;
  if (lastDistToCam !== null && deltaTime > 0.001) {
    rateOfChange = (distToCam - lastDistToCam) / deltaTime; // positive = moving away, negative = approaching
  }
  lastDistToCam = distToCam;

  // Doppler pitch factor:
  const isTrackside = ["tv", "trackside", "low_side", "crane", "helicopter", "finish"].includes(cameraMode);
  let dopplerFactor = 1.0;

  if (isTrackside) {
    // Exaggerate slightly for cinematic trackside pass-by sound
    dopplerFactor = 1.0 - rateOfChange / 220;
    dopplerFactor = Math.max(0.65, Math.min(1.45, dopplerFactor));
  }

  // Base engine pitch scaled by car speed (RPM)
  // Low frequency for idle, higher for top speed. Real engines fire ~40-250Hz.
  const idleFreq = 25; // Much deeper idle
  const maxFreq = 120; // Lower max frequency for a deeper V8 roar
  const baseFreq = idleFreq + (speedKmh / 280) * (maxFreq - idleFreq);
  const finalFreq = baseFreq * dopplerFactor;

  // Osc 1: Base fundamental
  raceEngineOsc1.frequency.setTargetAtTime(finalFreq, now, 0.03);
  
  // Osc 2: Detuned octave for screaming highs (now just slightly detuned)
  raceEngineOsc2.frequency.setTargetAtTime(finalFreq * 1.01, now, 0.03);
  
  // Osc 3: Sub-octave triangle for deep body and rumble
  raceEngineOsc3.frequency.setTargetAtTime(finalFreq * 0.5, now, 0.03);

  // Filter frequency opens up with RPM / speed
  const filterFreq = 150 + (speedKmh / 280) * 2000;
  raceEngineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

  // Volume:
  let targetVol = 0;
  if (isTrackside) {
    // Proximity attenuation for trackside camera pass-by
    const prox = 1 / (1 + Math.pow(distToCam / 14, 1.8));
    targetVol = Math.min(0.45, prox * 0.6) * masterVolume;
  } else {
    // Cockpit / onboard camera: constant engine sound
    targetVol = 0.3 * masterVolume;
  }

  raceEngineGain.gain.setTargetAtTime(targetVol, now, 0.04);
};

/**
 * Updates tire squeal audio based on cornering load (G-force in turns).
 */
export const updateTireSquealAudio = (
  corneringLoad: number, // 0.0 (straight) to 1.0 (extreme hard cornering)
  speedKmh: number,
  masterVolume = 1.0
) => {
  if (!audioCtx || masterVolume === 0 || !tireSquealGain || !tireSquealFilter) return;

  const now = audioCtx.currentTime;
  // Tire squeal activates when cornering hard at decent speed (> 35kmh)
  const threshold = 0.32;
  if (corneringLoad > threshold && speedKmh > 35) {
    const intensity = (corneringLoad - threshold) / (1 - threshold);
    const targetVol = Math.min(0.28, intensity * 0.25) * masterVolume;

    // Vary squeal pitch with cornering intensity
    const squealFreq = 2000 + intensity * 700 + Math.sin(now * 15) * 80;

    tireSquealGain.gain.setTargetAtTime(targetVol, now, 0.03);
    tireSquealFilter.frequency.setTargetAtTime(squealFreq, now, 0.03);
  } else {
    tireSquealGain.gain.setTargetAtTime(0, now, 0.05);
  }
};

/**
 * Triggers a metallic / sub-bass kerb impact thud ("impacto nas zebras").
 */
export const playKerbImpactSound = (masterVolume = 1.0) => {
  if (!audioCtx || masterVolume === 0) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const now = audioCtx.currentTime;
  if (now - lastKerbSoundTime < 0.12) return; // limit frequency of rumble hits
  lastKerbSoundTime = now;

  try {
    // Low rumble sub-bass thud
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.09);

    const vol = 0.3 * masterVolume;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.09);

    // Kerb metallic rattle noise pop
    const bufferSize = audioCtx.sampleRate * 0.05;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, now);

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.2 * masterVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    noise.start(now);
  } catch (_) {}
};

/**
 * Cleans up and silences continuous race audio nodes.
 */
export const stopRaceAudio = () => {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  if (raceEngineGain) {
    try {
      raceEngineGain.gain.setTargetAtTime(0, now, 0.05);
    } catch (_) {}
  }
  if (tireSquealGain) {
    try {
      tireSquealGain.gain.setTargetAtTime(0, now, 0.05);
    } catch (_) {}
  }
  lastDistToCam = null;
};


