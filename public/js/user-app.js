// ══════════════════════════════════════════
// User Portal — App Logic
// ══════════════════════════════════════════

let currentUser = null;

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

        // If not a 'user' role, redirect to admin dashboard
        if (currentUser.role !== 'user') {
            window.location.href = '/';
            return;
        }

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
    try { await fetch('/api/auth/logout'); } catch (e) {}
    window.location.href = '/login';
}

// ── Navigation ───────────────────────────
function navigateTo(page) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) item.classList.add('active');
    });

    switch (page) {
        case 'dashboard': loadUserDashboard(); break;
        case 'blood-availability': loadBloodAvailability(); break;
        case 'my-requests': loadMyRequests(); break;
        case 'camps': loadCamps(); break;
        case 'my-camps': loadMyCamps(); break;
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

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
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
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
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
        upcoming: '<span class="badge badge-info">Upcoming</span>',
        ongoing: '<span class="badge badge-success">Ongoing</span>',
        completed: '<span class="badge badge-gray">Completed</span>',
        cancelled: '<span class="badge badge-danger">Cancelled</span>'
    };
    return map[status] || status;
}

// ══════════════════════════════════════════
// PAGE: Dashboard
// ══════════════════════════════════════════
async function loadUserDashboard() {
    // Load stats
    const statsResult = await apiCall('/api/user/dashboard');
    if (statsResult && statsResult.ok) {
        const s = statsResult.data;
        document.getElementById('statMyRequests').textContent = s.myRequests;
        document.getElementById('statPending').textContent = s.pendingRequests;
        document.getElementById('statFulfilled').textContent = s.fulfilledRequests;
        document.getElementById('statMyCamps').textContent = s.myCamps;

        // Update pending badge in sidebar
        const badge = document.getElementById('pendingBadge');
        if (s.pendingRequests > 0) {
            badge.textContent = s.pendingRequests;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    }

    // Load mini inventory
    const invResult = await apiCall('/api/user/inventory');
    if (invResult && invResult.ok) {
        const grid = document.getElementById('dashInventoryGrid');
        grid.innerHTML = invResult.data.inventory.map(item => `
            <div class="inventory-card ${item.units_available < 5 ? 'critical-stock' : item.units_available < 15 ? 'low-stock' : ''}">
                <div class="stock-indicator"></div>
                <div class="blood-type">${item.blood_group}</div>
                <div class="units">${item.units_available}</div>
                <div class="units-label">units</div>
            </div>
        `).join('');
    }

    // Load upcoming camps (max 3)
    const campsResult = await apiCall('/api/user/camps');
    if (campsResult && campsResult.ok) {
        const container = document.getElementById('dashCampsList');
        const camps = campsResult.data.camps.slice(0, 3);
        if (camps.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🏕️</div>
                    <h3>No upcoming camps</h3>
                    <p>Check back later for donation opportunities.</p>
                </div>`;
        } else {
            container.innerHTML = camps.map(camp => `
                <div class="user-camp-mini">
                    <div class="d-flex align-center justify-between">
                        <div>
                            <div style="font-weight:600; color:var(--gray-900); margin-bottom:2px;">${camp.camp_name}</div>
                            <div style="font-size:13px; color:var(--gray-500);">📍 ${camp.location}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:13px; font-weight:600; color:var(--primary);">${formatDate(camp.camp_date)}</div>
                            ${camp.is_registered ? '<span class="badge badge-success" style="margin-top:4px;">Registered</span>' : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
}

// ══════════════════════════════════════════
// PAGE: Blood Availability
// ══════════════════════════════════════════
async function loadBloodAvailability() {
    const result = await apiCall('/api/user/inventory');
    if (!result || !result.ok) return;

    const grid = document.getElementById('bloodGrid');
    grid.innerHTML = result.data.inventory.map(item => `
        <div class="user-blood-card ${item.units_available < 5 ? 'critical-stock' : item.units_available < 15 ? 'low-stock' : ''}">
            <div class="stock-indicator"></div>
            <div class="blood-type">${item.blood_group}</div>
            <div class="units">${item.units_available}</div>
            <div class="units-label">units available</div>
            <div class="blood-card-status">
                ${item.units_available < 5 ? '<span class="badge badge-danger">Critical</span>' :
                  item.units_available < 15 ? '<span class="badge badge-warning">Low Stock</span>' :
                  '<span class="badge badge-success">Available</span>'}
            </div>
            <button class="btn btn-primary btn-sm btn-full mt-2" onclick="openRequestModal('${item.blood_group}')">
                Request ${item.blood_group}
            </button>
        </div>
    `).join('');
}

function openRequestModal(bloodGroup) {
    if (bloodGroup) {
        document.getElementById('reqBloodGroup').value = bloodGroup;
    }
    openModal('requestBloodModal');
}

// ══════════════════════════════════════════
// PAGE: My Requests
// ══════════════════════════════════════════
async function loadMyRequests() {
    const result = await apiCall('/api/user/my-requests');
    if (!result || !result.ok) return;

    const tbody = document.getElementById('myRequestsTable');
    const requests = result.data.requests;

    if (requests.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7">
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No blood requests yet</h3>
                    <p>Submit a request when you need blood.</p>
                </div>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = requests.map(r => `
        <tr>
            <td><strong>${r.patient_name}</strong></td>
            <td>${r.hospital_name}</td>
            <td><span class="blood-badge">${r.blood_group}</span></td>
            <td>${r.units_needed}</td>
            <td>${getUrgencyBadge(r.urgency)}</td>
            <td>${getStatusBadge(r.status)}</td>
            <td style="font-size:13px; color:var(--gray-500);">${formatDate(r.requested_at)}</td>
        </tr>
    `).join('');
}

// ── Submit Blood Request ─────────────────
async function submitBloodRequest(e) {
    e.preventDefault();
    const btn = document.getElementById('reqSubmitBtn');
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    const body = {
        patient_name: document.getElementById('reqPatient').value.trim(),
        hospital_name: document.getElementById('reqHospital').value.trim(),
        blood_group: document.getElementById('reqBloodGroup').value,
        units_needed: document.getElementById('reqUnits').value,
        urgency: document.getElementById('reqUrgency').value,
        contact_phone: document.getElementById('reqPhone').value.trim(),
        reason: document.getElementById('reqReason').value.trim()
    };

    const result = await apiCall('/api/user/request-blood', {
        method: 'POST',
        body: JSON.stringify(body)
    });

    btn.textContent = 'Submit Request';
    btn.disabled = false;

    if (result && result.ok) {
        showToast('Blood request submitted successfully!');
        closeModal('requestBloodModal');
        document.getElementById('requestBloodForm').reset();
        loadMyRequests();
        loadUserDashboard();
    } else {
        showToast(result?.data?.error || 'Failed to submit request', 'error');
    }
}

// ══════════════════════════════════════════
// PAGE: Donation Camps
// ══════════════════════════════════════════
async function loadCamps() {
    const result = await apiCall('/api/user/camps');
    if (!result || !result.ok) return;

    const container = document.getElementById('campsGrid');
    const camps = result.data.camps;

    if (camps.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏕️</div>
                <h3>No upcoming camps</h3>
                <p>There are no donation camps scheduled at the moment. Check back later!</p>
            </div>`;
        return;
    }

    container.innerHTML = camps.map(camp => `
        <div class="user-camp-card">
            <div class="camp-card-badge">${getStatusBadge(camp.status)}</div>
            <div class="camp-card-date">
                <span class="camp-date-day">${new Date(camp.camp_date).getDate()}</span>
                <span class="camp-date-month">${new Date(camp.camp_date).toLocaleString('en', { month: 'short' })}</span>
            </div>
            <div class="camp-card-info">
                <h3>${camp.camp_name}</h3>
                <div class="camp-detail"><span>📍</span> ${camp.location}</div>
                ${camp.start_time ? `<div class="camp-detail"><span>🕐</span> ${formatTime(camp.start_time)}${camp.end_time ? ' - ' + formatTime(camp.end_time) : ''}</div>` : ''}
                ${camp.organizer ? `<div class="camp-detail"><span>👤</span> ${camp.organizer}</div>` : ''}
                ${camp.description ? `<p class="camp-desc">${camp.description}</p>` : ''}
                <div class="camp-card-footer">
                    <div class="camp-attendees">
                        <span class="badge badge-gray">👥 ${camp.registered_count} registered</span>
                        ${camp.expected_donors ? `<span style="font-size:12px;color:var(--gray-500);"> of ${camp.expected_donors} expected</span>` : ''}
                    </div>
                    ${camp.is_registered
                        ? `<button class="btn btn-secondary btn-sm" onclick="unregisterCamp(${camp.id})">Cancel Registration</button>`
                        : `<button class="btn btn-primary btn-sm" onclick="registerCamp(${camp.id})">🙋 Join Camp</button>`
                    }
                </div>
            </div>
        </div>
    `).join('');
}

async function registerCamp(campId) {
    const result = await apiCall(`/api/user/camps/${campId}/register`, { method: 'POST' });
    if (result && result.ok) {
        showToast('Successfully registered for the camp! 🎉');
        loadCamps();
        loadUserDashboard();
    } else {
        showToast(result?.data?.error || 'Registration failed', 'error');
    }
}

async function unregisterCamp(campId) {
    if (!confirm('Are you sure you want to cancel your registration?')) return;
    const result = await apiCall(`/api/user/camps/${campId}/register`, { method: 'DELETE' });
    if (result && result.ok) {
        showToast('Registration cancelled');
        loadCamps();
        loadMyCamps();
        loadUserDashboard();
    } else {
        showToast(result?.data?.error || 'Failed to cancel', 'error');
    }
}

// ══════════════════════════════════════════
// PAGE: My Camps
// ══════════════════════════════════════════
async function loadMyCamps() {
    const result = await apiCall('/api/user/my-camps');
    if (!result || !result.ok) return;

    const container = document.getElementById('myCampsGrid');
    const camps = result.data.camps;

    if (camps.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h3>No registrations yet</h3>
                <p>Browse upcoming camps and join one to contribute!</p>
                <button class="btn btn-primary mt-2" onclick="navigateTo('camps')">Browse Camps</button>
            </div>`;
        return;
    }

    container.innerHTML = camps.map(camp => `
        <div class="user-camp-card registered">
            <div class="camp-card-badge">
                ${getStatusBadge(camp.status)}
                <span class="badge badge-success" style="margin-left:6px;">✓ Registered</span>
            </div>
            <div class="camp-card-date">
                <span class="camp-date-day">${new Date(camp.camp_date).getDate()}</span>
                <span class="camp-date-month">${new Date(camp.camp_date).toLocaleString('en', { month: 'short' })}</span>
            </div>
            <div class="camp-card-info">
                <h3>${camp.camp_name}</h3>
                <div class="camp-detail"><span>📍</span> ${camp.location}</div>
                ${camp.start_time ? `<div class="camp-detail"><span>🕐</span> ${formatTime(camp.start_time)}${camp.end_time ? ' - ' + formatTime(camp.end_time) : ''}</div>` : ''}
                ${camp.organizer ? `<div class="camp-detail"><span>👤</span> ${camp.organizer}</div>` : ''}
                <div class="camp-card-footer">
                    <div class="camp-attendees">
                        <span style="font-size:12px;color:var(--gray-500);">Registered on ${formatDate(camp.registered_at)}</span>
                    </div>
                    ${camp.status === 'upcoming' || camp.status === 'ongoing' ?
                        `<button class="btn btn-secondary btn-sm" onclick="unregisterCamp(${camp.id})">Cancel</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// ── Initialize ───────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    navigateTo('dashboard');
});
