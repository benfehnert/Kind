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

// Active nav link (pathname match so hashes/query work; exclude CTA / mobile buttons)
function currentNavFilename() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  let name = parts.length ? parts[parts.length - 1] : 'index.html';
  if (!name.includes('.')) name = 'index.html';
  return name;
}

document.querySelectorAll('.nav__links a:not(.nav__cta), .nav__mobile a:not(.btn)').forEach(link => {
  try {
    const linkName = new URL(link.getAttribute('href'), window.location.href).pathname
      .split('/')
      .filter(Boolean)
      .pop() || 'index.html';
    if (linkName === currentNavFilename()) link.classList.add('active');
  } catch (_) {
    /* ignore */
  }
});

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
    form.style.display = 'none';
    parent.querySelector('.success-message').style.display = 'block';
  });
});
