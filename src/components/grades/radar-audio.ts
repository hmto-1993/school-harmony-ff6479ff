// Professional radar audio using Web Audio API
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Scanning tick — crisp professional beep */
export function playTickSound(pitch = 1200) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(pitch, now);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

/** Selection confirmed — clean double-tone chime */
export function playSelectSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // First tone
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, now);
  gain1.gain.setValueAtTime(0.12, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.15);

  // Second tone (higher, slightly delayed)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1320, now + 0.08);
  gain2.gain.setValueAtTime(0.1, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.25);
}

/** Correct answer — warm ascending major triad */
export function playCorrectSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const t = now + i * 0.07;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

/** Wrong answer — soft descending minor tone */
export function playWrongSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

/** Ambient scanning hum — subtle professional pulse, returns stop function */
export function startScanHum(): () => void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(180, now);
  gain.gain.setValueAtTime(0.03, now);

  lfo.type = "sine";
  lfo.frequency.setValueAtTime(2, now);
  lfoGain.gain.setValueAtTime(10, now);

  lfo.connect(lfoGain).connect(osc.frequency);
  osc.connect(gain).connect(ctx.destination);
  lfo.start(now);
  osc.start(now);

  return () => {
    const t = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.stop(t + 0.4);
    lfo.stop(t + 0.4);
  };
}
