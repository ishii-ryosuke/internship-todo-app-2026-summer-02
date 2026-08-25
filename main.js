// Simple Sidebar Toggle Logic
const profileBtn = document.getElementById('profile-btn');
const closeNavBtn = document.getElementById('close-nav');
const sideNav = document.getElementById('side-nav');
const navOverlay = document.getElementById('nav-overlay');

function openNav() {
    sideNav.classList.remove('translate-x-full');
    navOverlay.classList.remove('hidden');
    // small delay to allow display block to apply before fading in
    setTimeout(() => navOverlay.classList.add('opacity-100'), 10);
}

function closeNav() {
    sideNav.classList.add('translate-x-full');
    navOverlay.classList.remove('opacity-100');
    setTimeout(() => navOverlay.classList.add('hidden'), 300); // wait for transition
}

if (profileBtn) {
    profileBtn.addEventListener('click', openNav);
}
if (closeNavBtn) {
    closeNavBtn.addEventListener('click', closeNav);
}
if (navOverlay) {
    navOverlay.addEventListener('click', closeNav);
}
