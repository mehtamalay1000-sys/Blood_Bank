// ══════════════════════════════════════════
// Main App Logic — Navigation, Utils, Auth
// ══════════════════════════════════════════

let currentUser = null;
let allDonorsList = []; // cache for donor select dropdowns

// ── Auth Check ───────────────────────────
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/login';
            return;
        }
        const data = await res.json();
        currentUser = data.user;
        updateUserInfo();
    } catch (e) {
        window.location.href = '/login';
    }
}

function updateUserInfo() {
    if (!currentUser) return;
    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent = currentUser.role;
    document.getElementById('userAvatar').textContent = currentUser.full_name.charAt(0).toUpperCase();
}

async function logout() {
    try {
        await fetch('/api/auth/logout');
    } catch (e) {}
    window.location.href = '/login';
}

// ── Navigation ───────────────────────────
function navigateTo(page) {
    // Hide all page sections
    document.querySelectorAll('.page-section').forEach(s => {
        s.classList.remove('active');
    });

    // Show target page
    const target = document.getElementById(`page-${page}`);
    if (target) {
        target.classList.add('active');
    }

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Load page data
    switch (page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'donors':
            loadDonors();
            break;
        case 'inventory':
            loadInventory();
            loadDonations();
            break;
        case 'requests':
            loadRequests();
            break;
        case 'camps':
            loadCamps();
            break;
    }
}

// ── Modal Helpers ────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
            m.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// ── Toast Notifications ──────────────────
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ── API Helper ───────────────────────────
async function apiCall(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        const data = await res.json();
        
        if (res.status === 401) {
            window.location.href = '/login';
            return null;
        }
        
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        console.error('API Error:', err);
        showToast('Connection error. Please try again.', 'error');
        return null;
    }
}

// ── Format Helpers ───────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getUrgencyBadge(urgency) {
    const map = {
        normal: '<span class="badge badge-info">Normal</span>',
        urgent: '<span class="badge badge-warning">Urgent</span>',
        critical: '<span class="badge badge-danger">Critical</span>'
    };
    return map[urgency] || urgency;
}

function getStatusBadge(status) {
    const map = {
        pending: '<span class="badge badge-warning">Pending</span>',
        approved: '<span class="badge badge-info">Approved</span>',
        fulfilled: '<span class="badge badge-success">Fulfilled</span>',
        rejected: '<span class="badge badge-danger">Rejected</span>',
        collected: '<span class="badge badge-info">Collected</span>',
        tested: '<span class="badge badge-warning">Tested</span>',
        stored: '<span class="badge badge-success">Stored</span>',
        used: '<span class="badge badge-gray">Used</span>',
        expired: '<span class="badge badge-danger">Expired</span>',
        active: '<span class="badge badge-success">Active</span>',
        inactive: '<span class="badge badge-gray">Inactive</span>',
        upcoming: '<span class="badge badge-info">Upcoming</span>',
        ongoing: '<span class="badge badge-success">Ongoing</span>',
        completed: '<span class="badge badge-gray">Completed</span>',
        cancelled: '<span class="badge badge-danger">Cancelled</span>'
    };
    return map[status] || status;
}

// ── Load Donors for dropdowns ────────────
async function loadDonorsList() {
    const result = await apiCall('/api/donors?limit=1000&status=active');
    if (result && result.ok) {
        allDonorsList = result.data.donors;
    }
}

// ── Initialize ───────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadDonorsList();
    navigateTo('dashboard');
});
