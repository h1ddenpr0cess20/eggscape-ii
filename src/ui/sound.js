const VOICES = {
  jump: { from: 380, to: 720, time: 0.12, type: 'triangle', gain: 0.06 },
  land: { from: 190, to: 96, time: 0.09, type: 'sine', gain: 0.05 },
  crop: { from: 760, to: 1420, time: 0.1, type: 'triangle', gain: 0.055 },
  burst: { from: 420, to: 80, time: 0.24, type: 'triangle', gain: 0.08 },
  hit: { from: 260, to: 62, time: 0.3, type: 'sawtooth', gain: 0.09 },
  over: { from: 300, to: 44, time: 0.95, type: 'triangle', gain: 0.1 },
  start: { from: 220, to: 690, time: 0.32, type: 'triangle', gain: 0.06 },
};

/** A handful of oscillators' worth of barn dance, built on the first gesture
 *  because no browser will start an AudioContext before one. */
export function createSound() {
  let ctx = null;
  let muted = false;

  function context() {
    if (ctx) return ctx;
    const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  }

  return {
    get muted() { return muted; },
    set muted(value) { muted = Boolean(value); },

    play(name) {
      const voice = VOICES[name];
      if (!voice || muted) return;
      const audio = context();
      if (!audio) return;
      /** A resume that is refused is a run with no sound in it, not an
       *  unhandled rejection in everybody's console. */
      if (audio.state === 'suspended') audio.resume()?.catch(() => {});

      const now = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = voice.type;
      osc.frequency.setValueAtTime(voice.from, now);
      osc.frequency.exponentialRampToValueAtTime(voice.to, now + voice.time);
      gain.gain.setValueAtTime(voice.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + voice.time);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + voice.time + 0.02);
      /** Off the graph once it has been heard. A run plays hundreds of
       *  these, and every one of them stays wired to the destination
       *  until it is let go of. */
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    },
  };
}
