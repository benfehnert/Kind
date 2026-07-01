// ─────────────────────────────────────────────────────────────────────────
// Ad 1A — "single screen + pulse"  (4:5, ~4.5s)
//
//   • One app screen only: the Insights screen (frame-2).
//   • One background — the office scene is dropped from the rotation.
//   • A subtle "landing" pulse on the phone inside the first second to grab
//     attention, as if the phone just dropped into place.
//   • Ambient music slot (see src/lib/audio.js).
//
// This is a self-contained entry point; it does NOT share main.js.
// ─────────────────────────────────────────────────────────────────────────
import anime from 'animejs/lib/anime.es.js';
import './styles/ad-1a.css';
import { initAudio } from './lib/audio.js';
import { BACKGROUNDS } from './fixtures/backgrounds.js';
import mockupFrameSrc from './assets/mockup.svg';
import insightsScreenSrc from './assets/frame-4.png'; // the Insights screen

// Single nature background (office scene intentionally not used here).
const BACKGROUND = BACKGROUNDS[0];

const bgImg     = document.getElementById('bg-img');
const mockup    = document.getElementById('mockup');
const pulseRing = document.getElementById('pulse-ring');
const heroText  = document.getElementById('hero-text');
const detailText = document.getElementById('detail-text');

document.getElementById('mockup-frame').src = mockupFrameSrc;
document.getElementById('screenshot').src = insightsScreenSrc;
bgImg.src = BACKGROUND;
bgImg.style.opacity = '1';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

// The phone "lands": a quick settle on the frame paired with a ring that
// expands and fades. Kept subtle so it reads as arrival, not a bounce toy.
function landingPulse() {
  anime({
    targets: mockup,
    scale: [
      { value: 1.05, duration: 0 },
      { value: 0.985, duration: 220, easing: 'easeOutQuad' },
      { value: 1.0, duration: 380, easing: 'easeOutElastic(1, 0.6)' },
    ],
  });

  anime({
    targets: pulseRing,
    scale: [0.2, 1.15],
    opacity: [
      { value: 0.9, duration: 120, easing: 'easeOutQuad' },
      { value: 0, duration: 620, easing: 'easeOutSine' },
    ],
    duration: 740,
    easing: 'easeOutSine',
  });
}

// Slide the phone up and reveal the tagline + CTA panel; fade the hero out.
function revealCta() {
  const panelHeight = detailText.offsetHeight;

  anime
    .timeline({ easing: 'easeOutExpo', duration: 700 })
    .add({
      targets: mockup,
      translateY: -panelHeight * 0.4,
    })
    .add(
      {
        targets: detailText,
        translateY: ['100%', '0%'],
        opacity: [0, 1],
      },
      0
    )
    .add(
      {
        targets: heroText,
        opacity: [1, 0],
      },
      0
    );
}

async function init() {
  await preload([BACKGROUND, insightsScreenSrc]);
  initAudio();

  // ── Timeline ──
  await sleep(150);   // settle on first paint
  landingPulse();     // attention grab inside the first second
  await sleep(2700);  // hold on the Insights screen
  revealCta();        // ~2.85s → CTA lands by ~3.55s, ad ends ~4.5s
}

init();
