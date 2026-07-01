// Ambient music slot for the ad prototypes.
//
// Drop a *licensed* track at apps/ad-prototype/public/ambient.mp3 (Vite serves
// the public/ folder from the site root, so no bundler import is needed and a
// missing file degrades gracefully instead of breaking the build).
//
// Source guidance: prefer the YouTube Audio Library for the cleared track, and
// only use Free Music Archive when that exact track's license explicitly
// permits commercial advertising. Verify the license before shipping.
//
// Browsers block autoplay-with-sound until the page has a user gesture. We
// attempt to play immediately (works when recording with a prior interaction
// or with autoplay flags enabled) and, if blocked, show a one-tap overlay.
export function initAudio({ src = '/ambient.mp3', volume = 0.6 } = {}) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = volume;
  audio.preload = 'auto';

  const tryPlay = () => audio.play();

  tryPlay().catch(() => {
    const overlay = document.createElement('button');
    overlay.id = 'audio-unlock';
    overlay.type = 'button';
    overlay.textContent = '▶ Tap to start with sound';
    overlay.addEventListener('click', () => {
      tryPlay().finally(() => overlay.remove());
    });
    document.body.appendChild(overlay);
  });

  return audio;
}
