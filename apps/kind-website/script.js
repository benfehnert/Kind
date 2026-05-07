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

// Active nav link
const links = document.querySelectorAll('.nav__links a, .nav__mobile a');
links.forEach(link => {
  if (link.href === window.location.href) link.classList.add('active');
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
