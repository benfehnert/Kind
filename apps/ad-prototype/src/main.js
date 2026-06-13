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
const FRAME_MS = 500;

const bgImg      = document.getElementById('bg-img');
const screenshot = document.getElementById('screenshot');
const mockup     = document.getElementById('mockup');
const heroText   = document.getElementById('hero-text')
const detailText = document.getElementById('detail-text');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Preload all background images so cuts are truly instant
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

async function runFrames() {
  for (let i = 0; i < BACKGROUNDS.length; i++) {
    bgImg.src = BACKGROUNDS[i];
    screenshot.src = SCREENSHOTS[i % SCREENSHOTS.length];

    if (i === 0) {
      await sleep(1500);
    } else {
      await sleep(FRAME_MS);
    }
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
