// Tiny WebAudio synth: engine hum, sirens, shots, pickups and UI blips.
// No audio files, no network — every sound is generated in code.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenTimer = 0;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { this.ctx = null; }
  }
  tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  }
  shot() { this.tone(720, 0.09, 'sawtooth', 0.10, -560); this.tone(160, 0.06, 'square', 0.06, -80); }
  punch() { this.tone(120, 0.07, 'triangle', 0.12, -50); }
  pickup() { this.tone(660, 0.08, 'sine', 0.10); setTimeout(() => this.tone(990, 0.12, 'sine', 0.10), 60); }
  cash() { this.tone(880, 0.07, 'triangle', 0.10); setTimeout(() => this.tone(1320, 0.14, 'triangle', 0.10), 55); }
  crash() { this.tone(90, 0.22, 'sawtooth', 0.14, -40); }
  door() { this.tone(240, 0.06, 'square', 0.06, -60); }
  busted() { this.tone(392, 0.16, 'square', 0.09); setTimeout(() => this.tone(311, 0.16, 'square', 0.09), 150); setTimeout(() => this.tone(262, 0.3, 'square', 0.09), 300); }
  missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.10), i * 90)); }
  setEngine(on, speedRatio = 0) {
    if (!this.ctx) return;
    if (on && !this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineGain.gain.value = 0.025;
      this.engineOsc.connect(this.engineGain).connect(this.ctx.destination);
      this.engineOsc.start();
    }
    if (!on && this.engineOsc) {
      try { this.engineOsc.stop(); } catch { /* already stopped */ }
      this.engineOsc = null; this.engineGain = null;
    }
    if (this.engineOsc) this.engineOsc.frequency.value = 55 + speedRatio * 130;
  }
  sirenTick(dt, active) {
    if (!active || !this.ctx) return;
    this.sirenTimer -= dt;
    if (this.sirenTimer <= 0) {
      this.sirenTimer = 0.72;
      this.tone(660, 0.34, 'triangle', 0.028, 240);
    }
  }
}
