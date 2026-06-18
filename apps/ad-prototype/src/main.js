import anime from 'animejs/lib/anime.es.js';
import "./styles/main.css";
import { BACKGROUNDS } from './fixtures/backgrounds.js';
import mockupFrameSrc from './assets/mockup.svg';
import frame1Src from './assets/frame-1.png';
import frame2Src from './assets/frame-2.png';
import frame3Src from './assets/frame-3.png';
import frame4Src from './assets/frame-4.png'
import frame5Src from './assets/frame-5.png'

const SCREENSHOTS = [frame1Src, frame2Src, frame3Src, frame4Src, frame5Src];

document.getElementById('mockup-frame').src = mockupFrameSrc;

// Each frame is held for this long before cutting to the next.
const FRAME_MS = 800;

// Two image layers per crossfadeable element. The incoming layer is always
// raised to z-index 1 and faded in on top; the previous layer sits underneath.
const bgA = document.getElementById('bg-img');
const bgB = bgA.cloneNode();
bgB.id = 'bg-img-b';
bgA.parentElement.appendChild(bgB);

const ssA = document.getElementById('screenshot');
const ssB = ssA.cloneNode();
ssB.id = 'screenshot-b';
ssA.parentElement.appendChild(ssB);

const mockup     = document.getElementById('mockup');
const heroText   = document.getElementById('hero-text')
const detailText = document.getElementById('detail-text');

const BG_FADE_MS = 350;
const SS_FADE_MS = 180;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Preload all background images so crossfades are smooth
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

function crossfade(incoming, outgoing, src, duration) {
  incoming.src = src;
  incoming.style.zIndex = '1';
  outgoing.style.zIndex = '0';
  incoming.style.opacity = '0';
  return anime({
    targets: incoming,
    opacity: [0, 1],
    duration,
    easing: 'easeInOutSine',
  }).finished;
}

async function runFrames() {
  let bgCurrent = bgA, bgNext = bgB;
  let ssCurrent = ssA, ssNext = ssB;

  bgA.src = BACKGROUNDS[0];
  bgA.style.opacity = '1';
  bgA.style.zIndex = '1';
  bgB.style.opacity = '0';
  bgB.style.zIndex = '0';

  ssA.src = SCREENSHOTS[0];
  ssA.style.opacity = '1';
  ssA.style.zIndex = '1';
  ssB.style.opacity = '0';
  ssB.style.zIndex = '0';

  await sleep(1500);

  for (let i = 1; i < BACKGROUNDS.length; i++) {
    await Promise.all([
      crossfade(bgNext, bgCurrent, BACKGROUNDS[i], BG_FADE_MS),
      crossfade(ssNext, ssCurrent, SCREENSHOTS[i % SCREENSHOTS.length], SS_FADE_MS),
    ]);
    [bgCurrent, bgNext] = [bgNext, bgCurrent];
    [ssCurrent, ssNext] = [ssNext, ssCurrent];
    await sleep(FRAME_MS);
  }
}

function revealTagline() {
  const panelHeight = detailText.offsetHeight;

  anime
    .timeline({ easing: 'easeOutExpo', duration: 750 })
    .add({
      targets: mockup,
      translateY: -panelHeight * 0.45,
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
        opacity: [1, 0]
      },
      0
    );
}

async function init() {
  await preload([...BACKGROUNDS, ...SCREENSHOTS]);
  await runFrames();
  revealTagline();
}

init();
