const PIP = '●';

const LEAD = {
  ready: 'Roll east, pull up what is growing, and do not meet a bale.',
  over: 'Back in the carton. There is always another morning.',
};

function stat(label, value) {
  return `<div class="stat"><dt>${label}</dt><dd>${value}</dd></div>`;
}

function metres(value) {
  return `${Math.max(0, Math.floor(value))}m`;
}

/**
 * The readouts, and the sign that covers them between runs. Markup lives in
 * index.html; this only ever writes text and flips `hidden`.
 */
export function createHud(doc = document, lives = 3) {
  const $ = (id) => doc.getElementById(id);

  const score = $('score');
  const distance = $('distance');
  const crops = $('crops');
  const shells = $('shells');
  const overlay = $('overlay');
  const kicker = $('overlay-kicker');
  const lead = $('overlay-lead');
  const stats = $('overlay-stats');
  const play = $('play');

  function pips(left) {
    return PIP.repeat(Math.max(0, left)) + `<span class="spent">${PIP.repeat(Math.max(0, lives - left))}</span>`;
  }

  /** The readouts are written sixty times a second and change a handful of
   *  times a run, so each one only touches the DOM when its text moves. */
  const shown = {};
  function put(node, key, value, html = false) {
    if (shown[key] === value) return;
    shown[key] = value;
    if (html) node.innerHTML = value;
    else node.textContent = value;
  }

  return {
    update(snapshot) {
      put(score, 'score', String(snapshot.score));
      put(distance, 'distance', metres(snapshot.distance));
      put(crops, 'crops', String(snapshot.crops));
      put(shells, 'shells', pips(snapshot.lives), true);
    },

    ready(best) {
      overlay.hidden = false;
      overlay.dataset.state = 'ready';
      kicker.textContent = 'the gate was open…';
      lead.textContent = LEAD.ready;
      stats.hidden = best <= 0;
      stats.innerHTML = best > 0 ? stat('best', best) : '';
      play.textContent = 'run for it';
    },

    over(snapshot, best) {
      overlay.hidden = false;
      overlay.dataset.state = 'over';
      kicker.textContent = 'scrambled';
      lead.textContent = LEAD.over;
      stats.hidden = false;
      stats.innerHTML = [
        ['score', snapshot.score],
        ['field', metres(snapshot.distance)],
        ['crops', snapshot.crops],
        /** Bales only earn a column on a run that burst one. */
        ...(snapshot.bales > 0 ? [['bales', snapshot.bales]] : []),
        ['best', best],
      ].map(([label, value]) => stat(label, value)).join('');
      play.textContent = 'again';
    },

    running() {
      overlay.hidden = true;
      overlay.dataset.state = 'running';
    },

    onPlay(fn) {
      play.addEventListener('click', (event) => {
        event.stopPropagation();
        fn();
      });
    },
  };
}
