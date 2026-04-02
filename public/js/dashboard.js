// ══════════════════════════════════════════
// Dashboard Page Logic
// ══════════════════════════════════════════

async function loadDashboard() {
    loadDashboardStats();
    loadInventoryChart();
    loadRecentRequests();
    loadRecentDonations();
}

async function loadDashboardStats() {
    const result = await apiCall('/api/dashboard/stats');
    if (!result || !result.ok) return;

    const s = result.data;
    animateNumber('statDonors', s.totalDonors);
    animateNumber('statUnits', s.totalBloodUnits);
    animateNumber('statPending', s.pendingRequests);
    animateNumber('statCamps', s.upcomingCamps);
    animateNumber('statMonthly', s.monthlyDonations);
    animateNumber('statCritical', s.criticalRequests);

    // Update pending badge in sidebar
    const badge = document.getElementById('pendingBadge');
    if (s.pendingRequests > 0) {
        badge.textContent = s.pendingRequests;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
}

function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const targetNum = parseInt(target) || 0;
    const duration = 600;
    const start = performance.now();
    
    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(targetNum * eased);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

async function loadInventoryChart() {
    const result = await apiCall('/api/dashboard/inventory-chart');
    if (!result || !result.ok) return;

    const data = result.data.data;
    const container = document.getElementById('inventoryChart');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No inventory data</p></div>';
        return;
    }

    const maxUnits = Math.max(...data.map(d => d.units_available), 1);

    container.innerHTML = data.map(item => {
        const height = Math.max((item.units_available / maxUnits) * 100, 3);
        let barColor = 'linear-gradient(180deg, #DC3545, #E8616D)';
        
        if (item.units_available < 5) {
            barColor = 'linear-gradient(180deg, #F44336, #FF7043)';
        } else if (item.units_available < 15) {
            barColor = 'linear-gradient(180deg, #FF9800, #FFB74D)';
        } else {
            barColor = 'linear-gradient(180deg, #DC3545, #E8616D)';
        }

        return `
            <div class="bar-item">
                <div class="bar-value">${item.units_available}</div>
                <div class="bar" style="height: ${height}%; background: ${barColor};" title="${item.blood_group}: ${item.units_available} units"></div>
                <div class="bar-label">${item.blood_group}</div>
            </div>
        `;
    }).join('');
}

async function loadRecentRequests() {
    const result = await apiCall('/api/dashboard/recent-requests');
    if (!result || !result.ok) return;

    const tbody = document.getElementById('recentRequestsTable');
    const requests = result.data.requests;

    if (!requests || requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding:30px;">No requests yet</td></tr>';
        return;
    }

    tbody.innerHTML = requests.slice(0, 5).map(r => `
        <tr>
            <td><strong>${r.patient_name}</strong><br><small class="text-muted">${r.hospital_name}</small></td>
            <td><span class="blood-badge">${r.blood_group}</span></td>
            <td>${getUrgencyBadge(r.urgency)}</td>
            <td>${getStatusBadge(r.status)}</td>
        </tr>
    `).join('');
}

async function loadRecentDonations() {
    const result = await apiCall('/api/dashboard/recent-donations');
    if (!result || !result.ok) return;

    const tbody = document.getElementById('recentDonationsTable');
    const donations = result.data.donations;

    if (!donations || donations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:30px;">No donations yet</td></tr>';
        return;
    }

    tbody.innerHTML = donations.slice(0, 5).map(d => `
        <tr>
            <td><strong>${d.donor_name}</strong></td>
            <td><span class="blood-badge">${d.blood_group}</span></td>
            <td>${formatDate(d.donation_date)}</td>
            <td>${d.units}</td>
            <td>${getStatusBadge(d.status)}</td>
        </tr>
    `).join('');
}
