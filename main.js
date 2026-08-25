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

// Logout Modal Logic
const logoutBtn = document.getElementById('logout-btn');
const logoutModal = document.getElementById('logout-modal');
const logoutOverlay = document.getElementById('logout-overlay');
const logoutConfirmBtn = document.getElementById('logout-confirm-btn');
const logoutCancelBtn = document.getElementById('logout-cancel-btn');

function openLogoutModal() {
    if (logoutModal) {
        logoutModal.classList.remove('hidden');
    }
}

function closeLogoutModal() {
    if (logoutModal) {
        logoutModal.classList.add('hidden');
    }
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', openLogoutModal);
}
if (logoutCancelBtn) {
    logoutCancelBtn.addEventListener('click', closeLogoutModal);
}
if (logoutOverlay) {
    logoutOverlay.addEventListener('click', closeLogoutModal);
}
if (logoutConfirmBtn) {
    logoutConfirmBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && logoutModal && !logoutModal.classList.contains('hidden')) {
        closeLogoutModal();
    }
});
