// Sci-fi radar audio using Web Audio API (no external files needed)
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Scanning tick sound — short blip */
export function playTickSound(pitch = 800) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(pitch, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(pitch * 1.2, ctx.currentTime + 0.04);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

/** Selection confirmed — rising tone */
export function playSelectSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(400, now);
  osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
  gain1.gain.setValueAtTime(0.2, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.5);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(600, now + 0.1);
  osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.35);
  gain2.gain.setValueAtTime(0.1, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start(now + 0.1);
  osc2.stop(now + 0.5);
}

/** Correct answer — cheerful ascending chime */
export function playCorrectSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const t = now + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

/** Wrong answer — descending buzz */
export function playWrongSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}

/** Ambient scanning hum — continuous, returns stop function */
export function startScanHum(): () => void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(120, now);
  gain.gain.setValueAtTime(0.06, now);

  lfo.type = "sine";
  lfo.frequency.setValueAtTime(4, now);
  lfoGain.gain.setValueAtTime(30, now);

  lfo.connect(lfoGain).connect(osc.frequency);
  osc.connect(gain).connect(ctx.destination);
  lfo.start(now);
  osc.start(now);

  return () => {
    const t = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.stop(t + 0.3);
    lfo.stop(t + 0.3);
  };
}
