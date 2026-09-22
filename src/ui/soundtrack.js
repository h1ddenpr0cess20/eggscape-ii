import { diatonic, hit, retune, rest, shape } from './music.js';

/**
 * Eggscape the Farm: a hoedown. Upright bass on one and three, a mandolin
 * chop on two and four, a banjo rolling sixteenths over the top of both, and
 * a fiddle with the tune — which is the whole of bluegrass, and the whole of
 * a field on a bright afternoon with something small running across it.
 *
 * G major, and the oldest changes there are: G G C G, G G D G.
 */

const G_MAJOR = [7, 9, 11, 0, 2, 4, 6];

const CHORDS = {
  G: { boom: ['g2', 'd2'], chop: 'g3+b3+d4', roll: ['g3', 'b3', 'g4', 'd4'] },
  C: { boom: ['c3', 'g2'], chop: 'g3+c4+e4', roll: ['c4', 'e4', 'g4', 'c5'] },
  D: { boom: ['d3', 'a2'], chop: 'a3+d4+f#4', roll: ['d4', 'f#4', 'a4', 'd5'] },
};

const FORM = ['G', 'G', 'C', 'G', 'G', 'G', 'D', 'G'];

const each = (write) => FORM.map((name, i) => write(CHORDS[name], i)).join(' | ');

/** Boom on one and three — and at the end of a line, a walk to the next. */
const WALKS = {
  3: 'g2 - . . f#2 - . . e2 - . . d2 - . .',
  5: 'g2 - . . a2 - . . b2 - . . c#3 - . .',
  7: 'g2 - . . a2 - . . b2 - . . d3 - . .',
};
const boom = ({ boom: [root, fifth] }, i) => WALKS[i] ?? `${root} - . . . . . . ${fifth} - . . . . . .`;

const chop = ({ chop: chord }) => `. . . . ${chord} . . . . . . . ${chord} . . .`;

/** A forward roll: thumb, index, middle, and the short fifth string ringing
 *  through all of it, twice a bar. */
const roll = ({ roll: [low, mid, drone, high] }) => {
  const half = `${low} ${mid} ${drone} ${high} ${mid} ${drone} ${high} ${drone}`;
  return `${half} ${half}`;
};

const TUNE = [
  'g4 - b4 - d5 - b4 - g5 - - - d5 - b4 -',
  'c5 - b4 - a4 - g4 - a4 - b4 - a4 - - -',
  'e5 - g5 - e5 - c5 - e5 - - - d5 - c5 -',
  'b4 - d5 - b4 - g4 - b4 - a4 - g4 - - -',
  'g4 - b4 - d5 - g5 - a5 - g5 - e5 - d5 -',
  'e5 - d5 - b4 - d5 - g4 - - - b4 - c5 -',
  'd5 - f#5 - a5 - f#5 - e5 - d5 - c5 - a4 -',
  'g4 - b4 - d5 - b4 - g4 - - - . . d4 -',
].join(' | ');

/** The second fiddle, a third under the first all the way — two steps down
 *  the key, which is what makes it sound like two people and not one. */
const TWIN = retune(TUNE, diatonic(G_MAJOR, -2));

/** The title is the porch before the gate opened: a guitar, picked slow, and
 *  a harmonica. */
const PORCH = ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G'];
const PICKING = {
  G: 'g2 . b3 . d3 . g3 . g2 . b3 . d3 . d4 .',
  C: 'c3 . e3 . g2 . c4 . c3 . e4 . g2 . g3 .',
  D: 'd3 . f#3 . a2 . d4 . d3 . f#4 . a2 . a3 .',
};
const HARP = [
  'b4 - - - - - - - d5 - - - b4 - a4 -',
  'g4 - - - - - - - e4 - - - g4 - - -',
  'd5 - - - - - - - b4 - d5 - e5 - d5 -',
  'a4 - - - - - - - - - - - . . . .',
  'b4 - - - - - - - d5 - - - b4 - a4 -',
  'g4 - - - e4 - - - c5 - - - b4 - a4 -',
  'a4 - - - - - f#4 - a4 - - - b4 - a4 -',
  'g4 - - - - - - - - - - - . . . .',
].join(' | ');
const BIRDS = [
  '. . . . . . . . . . x . . . . .',
  rest(16),
  '. . . . . o . x . . . . . . . .',
  rest(16),
].join(' | ');

/**
 * A plucked string, the Karplus–Strong way: a burst of noise going round a
 * delay line one period long, a little duller every time round. Made once at
 * one pitch and played back faster or slower for the rest — which also makes
 * the high notes die sooner, the way a real string's do.
 */
function string(ctx, freq, seconds, damping, brightness) {
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(rate * seconds), rate);
  const data = buffer.getChannelData(0);
  /** The averaging below is half a sample of delay of its own. */
  const period = Math.max(2, Math.round(rate / freq - 0.5));
  const line = new Float32Array(period);
  let seed = 20240917;
  for (let i = 0; i < period; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    line[i] = seed / 2 ** 31 - 1;
  }
  for (let i = 0; i < data.length; i++) {
    const j = i % period;
    const now = line[j];
    data[i] = now;
    line[j] = damping * (brightness * now + (1 - brightness) * line[(j + 1) % period]);
  }
  return { buffer, freq };
}

function instruments({ ctx, voice }) {
  const banjo = string(ctx, 196, 1.6, 0.995, 0.62);
  const guitar = string(ctx, 110, 3, 0.998, 0.5);

  function pluck(out, t, freq, from, { gain, ring, tone = 5000, twang = 0 }) {
    const note = voice(t);
    const src = note.buffer(from.buffer, freq / from.freq);
    const low = note.filter('lowpass', tone);
    const amp = note.gain();
    let into = src.connect(low);
    if (twang) {
      /** The drum head a banjo's strings sit on, ringing along. */
      const head = note.filter('peaking', 2100, 1.4);
      head.gain.setValueAtTime(twang, t);
      const thin = note.filter('highpass', 260);
      into = into.connect(head).connect(thin);
    }
    into.connect(amp).connect(out);
    note.play(shape(amp.gain, t, ring, { peak: gain, attack: 0.001, decay: 4, sustain: 1, release: 0.06 }));
  }

  return {
    banjo(out, t, dur, [freq], vel) {
      pluck(out, t, freq, banjo, { gain: 0.5 * vel, ring: Math.max(dur, 0.35), twang: 7 });
    },

    guitar(out, t, _dur, [freq], vel) {
      pluck(out, t, freq, guitar, { gain: 0.55 * vel, ring: 1.4, tone: 2600 });
    },

    /** A mandolin chord struck and stopped dead, which is a snare drum
     *  bluegrass can carry. */
    chop(out, t, _dur, freqs, vel) {
      freqs.forEach((freq, i) => {
        pluck(out, t + i * 0.007, freq * 2, banjo, { gain: 0.24 * vel, ring: 0.06, tone: 3600, twang: 4 });
      });
      const note = voice(t);
      const src = note.noise();
      const band = note.filter('bandpass', 2400, 1.2);
      const amp = note.gain();
      src.connect(band).connect(amp).connect(out);
      note.play(hit(amp.gain, t, 0.04, 0.12 * vel));
    },

    bass(out, t, dur, [freq], vel) {
      const note = voice(t);
      const body = note.osc('triangle', freq);
      const round = note.osc('sine', freq);
      body.frequency.setValueAtTime(freq * 1.02, t);
      body.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
      const low = note.filter('lowpass', 900);
      const amp = note.gain();
      body.connect(low);
      round.connect(low);
      low.connect(amp).connect(out);
      note.play(shape(amp.gain, t, Math.max(dur, 0.3), {
        peak: 0.7 * vel, attack: 0.004, decay: 0.3, sustain: 0.35, release: 0.08,
      }));
    },

    /** A saw, bowed: a scratch at the front, a vibrato that arrives late. */
    fiddle(out, t, dur, [freq], vel) {
      const note = voice(t);
      const low = note.filter('lowpass', 3800, 0.8);
      const body = note.filter('peaking', 1150, 1.1);
      body.gain.setValueAtTime(5, t);
      const thin = note.filter('highpass', 220);
      for (const cents of [0, 6]) {
        const osc = note.osc('sawtooth', freq, cents);
        note.wobble(osc.detune, 5.8, 16, 0.18);
        osc.connect(thin);
      }
      thin.connect(body).connect(low);
      const amp = note.gain();
      low.connect(amp).connect(out);
      const bow = note.noise();
      const rosin = note.filter('bandpass', 3200, 2);
      const bowAmp = note.gain();
      bow.connect(rosin).connect(bowAmp).connect(out);
      hit(bowAmp.gain, t, 0.05, 0.05 * vel);
      note.play(shape(amp.gain, t, dur * 0.92, {
        peak: 0.22 * vel, attack: 0.035, decay: 0.2, sustain: 0.8, release: 0.09,
      }));
    },

    /** A reed: bent up into every note from a little under it. */
    harmonica(out, t, dur, [freq], vel) {
      const note = voice(t);
      const low = note.filter('lowpass', 1900, 1.4);
      for (const type of ['sawtooth', 'square']) {
        const osc = note.osc(type, freq * 0.985);
        osc.frequency.exponentialRampToValueAtTime(freq, t + 0.09);
        note.wobble(osc.detune, 5, 10, 0.3);
        osc.connect(low);
      }
      const amp = note.gain();
      note.wobble(amp.gain, 5, 0.04, 0.3);
      low.connect(amp).connect(out);
      note.play(shape(amp.gain, t, dur * 0.95, {
        peak: 0.12 * vel, attack: 0.06, decay: 0.3, sustain: 0.8, release: 0.15,
      }));
    },

    /** A boot on a barn floor. */
    stomp(out, t, _dur, _freqs, vel) {
      const note = voice(t);
      const body = note.osc('sine', 115);
      body.frequency.exponentialRampToValueAtTime(48, t + 0.07);
      const amp = note.gain();
      body.connect(amp).connect(out);
      const board = note.noise();
      const low = note.filter('lowpass', 520);
      const boardAmp = note.gain();
      board.connect(low).connect(boardAmp).connect(out);
      hit(boardAmp.gain, t, 0.05, 0.35 * vel);
      note.play(hit(amp.gain, t, 0.22, 0.8 * vel));
    },

    washboard(out, t, _dur, _freqs, vel) {
      const note = voice(t);
      const src = note.noise();
      const band = note.filter('bandpass', 4600, 1.3);
      const amp = note.gain();
      src.connect(band).connect(amp).connect(out);
      note.play(hit(amp.gain, t, vel > 1.2 ? 0.07 : 0.035, 0.5 * vel, 0.004));
    },

    clap(out, t, _dur, _freqs, vel) {
      const note = voice(t);
      const src = note.noise();
      const band = note.filter('bandpass', 1150, 1);
      const amp = note.gain();
      src.connect(band).connect(amp).connect(out);
      amp.gain.setValueAtTime(0.7 * vel, t);
      amp.gain.setTargetAtTime(0.08, t, 0.004);
      amp.gain.setValueAtTime(0.7 * vel, t + 0.016);
      amp.gain.setTargetAtTime(0, t + 0.016, 0.03);
      note.play(t + 0.25);
    },

    /** Something in the hedge, twice. */
    chirp(out, t, _dur, _freqs, vel) {
      const note = voice(t);
      const src = note.osc('sine', 3200);
      const amp = note.gain();
      src.connect(amp).connect(out);
      for (const [at, from, to] of [[0, 3200, 4700], [0.09, 3500, 5100]]) {
        src.frequency.setValueAtTime(from, t + at);
        src.frequency.exponentialRampToValueAtTime(to, t + at + 0.05);
        amp.gain.setValueAtTime(0.0001, t + at);
        amp.gain.linearRampToValueAtTime(0.2 * vel, t + at + 0.01);
        amp.gain.setTargetAtTime(0, t + at + 0.02, 0.012);
      }
      note.play(t + 0.2);
    },
  };
}

export const SOUNDTRACK = {
  volume: 0.22,
  space: {
    /** A barn, not a cathedral. */
    reverb: { seconds: 1.3, decay: 4, level: 0.7 },
    echo: { beats: 0.5, feedback: 0.25, tone: 3000 },
  },
  instruments,

  /** Further into the fields, more of the band has turned up. */
  level(snapshot) {
    if (snapshot.state !== 'running') return 0;
    const field = snapshot.distance;
    return field < 100 ? 0 : field < 300 ? 1 : field < 600 ? 2 : 3;
  },

  cues: {
    title: {
      bpm: 84,
      swing: 0.14,
      parts: [
        { play: 'guitar', gain: 0.87, wet: 0.25, notes: PORCH.map((name) => PICKING[name]).join(' | ') },
        { play: 'harmonica', gain: 1, wet: 0.3, pan: 0.15, notes: HARP },
        { play: 'chirp', gain: 2, wet: 0.2, pan: -0.5, notes: BIRDS },
      ],
    },

    run: {
      bpm: 118,
      swing: 0.08,
      parts: [
        { play: 'bass', gain: 0.38, notes: each(boom) },
        { play: 'stomp', gain: 0.8, notes: 'x . . . . . . . x . . . . . . .' },
        { play: 'chop', gain: 2.5, pan: 0.2, wet: 0.15, notes: each(chop) },
        { play: 'banjo', gain: 0.87, at: 1, pan: -0.25, wet: 0.12, notes: each(roll) },
        { play: 'washboard', gain: 1.9, at: 2, pan: 0.35, notes: 'o . x . X . x . o . x . X . x .' },
        { play: 'fiddle', gain: 1, at: 2, wet: 0.25, pan: 0.1, notes: TUNE },
        { play: 'fiddle', gain: 0.6, at: 3, wet: 0.25, pan: -0.15, notes: TWIN },
        { play: 'clap', gain: 2.5, at: 3, wet: 0.3, notes: '. . . . x . . . . . . . x . . .' },
      ],
    },

    /** Shave and a haircut — and no two bits. */
    over: {
      bpm: 118,
      once: true,
      then: 'title',
      parts: [
        { play: 'banjo', gain: 1.1, wet: 0.2, notes: `g4 - - - d4 - d4 - e4 - - - d4 - - - ${rest(16)}` },
        { play: 'bass', gain: 0.38, notes: `g2 - - - . . . . . . . . d2 - - - ${rest(16)}` },
        { play: 'stomp', gain: 0.8, notes: `x . . . . . . . . . . . x . . . ${rest(16)}` },
      ],
    },
  },
};
