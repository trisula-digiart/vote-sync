/**
 * VOTE-SYNC CYBER CORE - AUTHENTICATION & RBAC CONTROLLER
 * File: js/auth.js
 * Description: Mengelola sesi login, otentikasi role user, dan visibilitas UI.
 */

/**
 * Inisialisasi awal sesi otentikasi
 */
function initAuth() {
    const savedToken = localStorage.getItem(CONFIG.STORAGE_KEY_TOKEN);
    if (savedToken) {
        state.token = savedToken;
        parseTokenToUser(savedToken);
    } else {
        // Default guest/admin session untuk demo
        state.currentUser = {
            username: 'admin',
            role: 'SUPER_ADMIN',
            fullName: 'Cyber Admin'
        };
    }
    applyRbacRules();
}

/**
 * Membaca payload token Base64
 */
function parseTokenToUser(token) {
    try {
        const decoded = atob(token);
        const parts = decoded.split(':');
        if (parts.length >= 2) {
            state.currentUser = {
                username: parts[0],
                role: parts[1],
                fullName: parts[0].toUpperCase()
            };
        }
    } catch (e) {
        console.warn('Format token tidak valid:', e);
    }
}

/**
 * Menerapkan visibilitas elemen berdasarkan Role User (SUPER_ADMIN vs ANALYST)
 */
function applyRbacRules() {
    const role = state.currentUser ? state.currentUser.role : 'ANALYST';
    
    // Update label user di sidebar
    const fullNameEl = document.getElementById('user-fullname');
    const roleEl = document.getElementById('user-role');
    const avatarEl = document.getElementById('user-avatar');

    if (fullNameEl) fullNameEl.textContent = state.currentUser.fullName || 'User';
    if (roleEl) roleEl.textContent = role;
    if (avatarEl) avatarEl.textContent = (state.currentUser.fullName || 'CA').substring(0, 2).toUpperCase();

    // Sembunyikan/Tampilkan tab khusus Super Admin
    const superAdminElements = document.querySelectorAll('.super-admin-only');
    superAdminElements.forEach(el => {
        if (role === 'SUPER_ADMIN') {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
}

/**
 * Logout dari sesi aplikasi
 */
function handleLogout() {
    localStorage.removeItem(CONFIG.STORAGE_KEY_TOKEN);
    state.token = '';
    state.currentUser = { username: 'guest', role: 'ANALYST', fullName: 'Guest User' };
    showToast('Sesi berhasil diakhiri.', 'info');
    applyRbacRules();
    switchTab('dashboard');
}
