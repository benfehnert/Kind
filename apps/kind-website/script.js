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
const NAV_PAGE_BY_SLUG = {
  '': 'home',
  'index.html': 'home',
  'individuals.html': 'individuals',
  'individuals': 'individuals',
  'researchers.html': 'researchers',
  'researchers': 'researchers',
  'faq.html': 'faq',
  'faq': 'faq'
};

const BODY_CLASS_NAV = {
  'path-home': 'home',
  'path-individuals': 'individuals',
  'path-researchers': 'researchers',
  'path-faq': 'faq'
};

let scrollNavOverride = null;

function navSlugFromPathname() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return (parts.length ? parts[parts.length - 1] : '').toLowerCase();
}

function navPageFromBody() {
  for (const [className, page] of Object.entries(BODY_CLASS_NAV)) {
    if (document.body.classList.contains(className)) return page;
  }
  return null;
}

function navPageFromPath() {
  return NAV_PAGE_BY_SLUG[navSlugFromPathname()] ?? null;
}

function getCurrentNavPage() {
  if (scrollNavOverride) return scrollNavOverride;
  return navPageFromBody() ?? navPageFromPath();
}

function getLinkNavPage(link) {
  if (link.dataset.nav) return link.dataset.nav;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:')) return null;
  try {
    const parts = new URL(href, window.location.href).pathname.split('/').filter(Boolean);
    const slug = (parts.length ? parts[parts.length - 1] : '').toLowerCase();
    return NAV_PAGE_BY_SLUG[slug] ?? null;
  } catch {
    return null;
  }
}

function applyActiveNav() {
  const current = getCurrentNavPage();
  if (current) document.body.dataset.navPage = current;
  else delete document.body.dataset.navPage;

  document.querySelectorAll('.nav__links a:not(.nav__cta), .nav__mobile a:not(.btn)').forEach(link => {
    link.classList.remove('active');
    link.removeAttribute('aria-current');
    if (current && getLinkNavPage(link) === current) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

function initInPageSectionNav() {
  const faqSection = document.getElementById('faq');
  const pageDefault = navPageFromBody();
  if (!faqSection || !pageDefault || pageDefault === 'faq') return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      scrollNavOverride = entry.isIntersecting ? 'faq' : null;
      applyActiveNav();
    },
    { rootMargin: '-20% 0px -40% 0px', threshold: 0 }
  );
  observer.observe(faqSection);
}

function initActiveNav() {
  applyActiveNav();
  initInPageSectionNav();
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
