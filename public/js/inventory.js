// ══════════════════════════════════════════
// Blood Inventory Page Logic
// ══════════════════════════════════════════

let inventoryData = [];
let donationsListData = [];

async function loadInventory() {
    const result = await apiCall('/api/inventory');
    if (!result || !result.ok) return;

    inventoryData = result.data.inventory;
    renderInventoryGrid();
}

function renderInventoryGrid() {
    const grid = document.getElementById('inventoryGrid');

    if (!inventoryData || inventoryData.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🩸</div><h3>No inventory data</h3></div>';
        return;
    }

    grid.innerHTML = inventoryData.map(item => {
        let stockClass = '';
        if (item.units_available <= 3) {
            stockClass = 'critical-stock';
        } else if (item.units_available <= 10) {
            stockClass = 'low-stock';
        }

        return `
            <div class="inventory-card ${stockClass}">
                <div class="stock-indicator"></div>
                <div class="blood-type">${item.blood_group}</div>
                <div class="units">${item.units_available}</div>
                <div class="units-label">Units Available</div>
            </div>
        `;
    }).join('');
}

async function loadDonations() {
    const status = document.getElementById('donationStatusFilter')?.value || '';
    let url = '/api/inventory/donations';
    if (status) url += `?status=${status}`;

    const result = await apiCall(url);
    if (!result || !result.ok) return;

    donationsListData = result.data.donations;
    renderDonationsTable();
}

function renderDonationsTable() {
    const tbody = document.getElementById('donationsTableBody');

    if (!donationsListData || donationsListData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div class="empty-icon">💉</div>
                        <h3>No donation records</h3>
                        <p>Record a new donation to get started.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    const statusOptions = ['collected', 'tested', 'stored', 'used', 'expired'];

    tbody.innerHTML = donationsListData.map(d => `
        <tr>
            <td><strong>${d.donor_name}</strong></td>
            <td><span class="blood-badge">${d.blood_group}</span></td>
            <td>${formatDate(d.donation_date)}</td>
            <td>${d.units}</td>
            <td>${getStatusBadge(d.status)}</td>
            <td>
                <select class="filter-select" style="padding:6px 28px 6px 10px; font-size:12px;" 
                        onchange="updateDonationStatus(${d.id}, this.value)" 
                        ${d.status === 'used' || d.status === 'expired' ? 'disabled' : ''}>
                    ${statusOptions.map(s => `<option value="${s}" ${d.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
                </select>
            </td>
        </tr>
    `).join('');
}

function filterDonations() {
    loadDonations();
}

function openRecordDonationModal() {
    document.getElementById('donationForm').reset();
    document.getElementById('donationDate').value = new Date().toISOString().split('T')[0];

    // Populate donor dropdown
    const select = document.getElementById('donationDonor');
    select.innerHTML = '<option value="">Choose a donor</option>' +
        allDonorsList.map(d => `<option value="${d.id}" data-blood="${d.blood_group}">${d.full_name} (${d.blood_group})</option>`).join('');

    openModal('donationModal');
}

function autofillBloodGroup() {
    const select = document.getElementById('donationDonor');
    const option = select.options[select.selectedIndex];
    if (option && option.dataset.blood) {
        document.getElementById('donationBloodGroup').value = option.dataset.blood;
    }
}

async function saveDonation() {
    const donationData = {
        donor_id: document.getElementById('donationDonor').value,
        blood_group: document.getElementById('donationBloodGroup').value,
        donation_date: document.getElementById('donationDate').value,
        units: parseFloat(document.getElementById('donationUnits').value) || 1,
        notes: document.getElementById('donationNotes').value.trim()
    };

    if (!donationData.donor_id || !donationData.blood_group || !donationData.donation_date) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const result = await apiCall('/api/inventory/donate', {
        method: 'POST',
        body: JSON.stringify(donationData)
    });

    if (result && result.ok) {
        showToast('Donation recorded successfully!', 'success');
        closeModal('donationModal');
        loadInventory();
        loadDonations();
        loadDonorsList();
    } else if (result) {
        showToast(result.data.error || 'Failed to record donation', 'error');
    }
}

async function updateDonationStatus(id, status) {
    const result = await apiCall(`/api/inventory/donation/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    });

    if (result && result.ok) {
        showToast(`Donation status updated to: ${status}`, 'success');
        loadInventory();
        loadDonations();
    } else if (result) {
        showToast(result.data.error || 'Failed to update status', 'error');
        loadDonations(); // reload to revert dropdown
    }
}
