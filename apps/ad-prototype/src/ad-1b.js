// ─────────────────────────────────────────────────────────────────────────
// Ad 1B — "message-first"  (4:5, ~4.8s)
//
//   Key constraint: NO CSS transforms on animated elements — anime.js v3
//   overwrites style.transform entirely, which breaks any CSS-based centering.
//   All centering is done via left/margin/flex in the CSS; anime owns transforms.
// ─────────────────────────────────────────────────────────────────────────
import anime from 'animejs/lib/anime.es.js';
import './styles/ad-1b.css';
import { initAudio } from './lib/audio.js';
import { BACKGROUND_ALTS } from './fixtures/backgrounds.js';
import mockupFrameSrc from './assets/mockup.svg';
import insightsScreenSrc from './assets/frame-4.png';

const BACKGROUND = BACKGROUND_ALTS[0];

const bgImg   = document.getElementById('bg-img');
const heroSub = document.getElementById('hero-sub');
const message = document.getElementById('message');
const mockup  = document.getElementById('mockup');
const ctaWrap = document.getElementById('cta-wrap');

document.getElementById('mockup-frame').src = mockupFrameSrc;
document.getElementById('screenshot').src = insightsScreenSrc;
bgImg.src = BACKGROUND;
bgImg.style.opacity = '1';

function preload(urls) {
  return Promise.all(
    urls.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = src;
        })
    )
  );
}

function run() {
  const tl = anime.timeline({ easing: 'easeOutExpo' });

  // 1.0s — "backed by science" fades in
  tl.add({
    targets: heroSub,
    opacity: [0, 1],
    translateY: [10, 0],
    duration: 480,
    easing: 'easeOutQuad',
  }, 800);

  // 1.6s — phone rises; message shrinks upward to make room.
  // translateY from-values are set by anime so there's no CSS-transform conflict.
  tl.add({
    targets: mockup,
    translateY: ['115%', '45%'],  // 30% lands the phone top just below the logo (~155px from top)
    duration: 800,
  }, 1800);

  tl.add({
    targets: message,
    translateY: [0, '-35%'],     // lifts upward as phone comes up
    opacity: [1, 0],
    scale: [1, 0.62],
    duration: 600,
  }, 1800);

  // 3.8s — CTA appears
  tl.add({
    targets: ctaWrap,
    opacity: [0, 1],
    translateY: [28, 0],
    duration: 550,
    easing: 'easeOutBack',
  }, 4800);
}

async function init() {
  await preload([BACKGROUND, insightsScreenSrc]);
  initAudio();
  run();
}

init();

// background tweaks
// keep the header on for a bit longer, slow down on the message
// early access in orange and larger, bleed out of phone