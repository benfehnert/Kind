// Mobile nav
const hamburger = document.querySelector('.nav__hamburger');
const mobileNav = document.querySelector('.nav__mobile');
if (hamburger) {
  hamburger.addEventListener('click', () => mobileNav.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
      mobileNav.classList.remove('open');
    }
  });
}

// Highlight the current page in top navigation (desktop + mobile)
function currentNavFilename() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const name = parts.length ? parts[parts.length - 1] : '';
  if (!name || !name.includes('.')) return 'index.html';
  return name;
}

const NAV_PAGE_BY_FILE = {
  'index.html': 'home',
  'individuals.html': 'individuals',
  'researchers.html': 'researchers',
  'faq.html': 'faq'
};

function getCurrentNavPage() {
  if (document.body.classList.contains('path-individuals')) return 'individuals';
  if (document.body.classList.contains('path-researchers')) return 'researchers';
  return NAV_PAGE_BY_FILE[currentNavFilename().toLowerCase()] || null;
}

function getLinkNavPage(link) {
  if (link.dataset.nav) return link.dataset.nav;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:')) return null;
  try {
    const parts = new URL(href, window.location.href).pathname.split('/').filter(Boolean);
    const name = parts.length ? parts[parts.length - 1] : '';
    const file = !name || !name.includes('.') ? 'index.html' : name.toLowerCase();
    return NAV_PAGE_BY_FILE[file] || null;
  } catch {
    return null;
  }
}

function initActiveNav() {
  const current = getCurrentNavPage();
  if (current) document.body.dataset.navPage = current;

  document.querySelectorAll('.nav__links a:not(.nav__cta), .nav__mobile a:not(.btn)').forEach(link => {
    link.classList.remove('active');
    link.removeAttribute('aria-current');
    if (current && getLinkNavPage(link) === current) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

initActiveNav();

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const answer = item.querySelector('.faq-answer');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(open => {
      open.classList.remove('open');
      open.querySelector('.faq-answer').style.maxHeight = null;
    });
    if (!isOpen) {
      item.classList.add('open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

// Waitlist form
document.querySelectorAll('.waitlist-form-el').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const parent = form.closest('.waitlist-form');
    if (parent) parent.classList.add('is-success');
  });
});
