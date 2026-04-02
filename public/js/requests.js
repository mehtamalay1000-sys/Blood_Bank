// ══════════════════════════════════════════
// Blood Requests Page Logic
// ══════════════════════════════════════════

let requestsData = [];

async function loadRequests() {
    const status = document.getElementById('requestStatusFilter')?.value || '';
    const urgency = document.getElementById('requestUrgencyFilter')?.value || '';
    const blood_group = document.getElementById('requestBloodFilter')?.value || '';

    let url = '/api/requests?';
    if (status) url += `status=${status}&`;
    if (urgency) url += `urgency=${urgency}&`;
    if (blood_group) url += `blood_group=${blood_group}&`;

    const result = await apiCall(url);
    if (!result || !result.ok) return;

    requestsData = result.data.requests;
    renderRequestsTable();
}

function renderRequestsTable() {
    const tbody = document.getElementById('requestsTableBody');

    if (!requestsData || requestsData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h3>No blood requests</h3>
                        <p>Create a new request to get started.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = requestsData.map(r => {
        let actions = '';
        
        if (r.status === 'pending') {
            actions = `
                <button class="btn btn-sm btn-success" onclick="updateRequestStatus(${r.id}, 'approved')" title="Approve">✓ Approve</button>
                <button class="btn btn-sm btn-danger" onclick="updateRequestStatus(${r.id}, 'rejected')" title="Reject">✕ Reject</button>
            `;
        } else if (r.status === 'approved') {
            actions = `
                <button class="btn btn-sm btn-success" onclick="updateRequestStatus(${r.id}, 'fulfilled')" title="Fulfill">📦 Fulfill</button>
            `;
        }

        actions += `
            <button class="btn btn-sm btn-secondary btn-icon" onclick="editRequest(${r.id})" title="Edit">✏️</button>
            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteRequest(${r.id})" title="Delete">🗑️</button>
        `;

        return `
            <tr>
                <td><strong>${r.patient_name}</strong></td>
                <td>${r.hospital_name}</td>
                <td><span class="blood-badge">${r.blood_group}</span></td>
                <td>${r.units_needed}</td>
                <td>${getUrgencyBadge(r.urgency)}</td>
                <td>${getStatusBadge(r.status)}</td>
                <td>${formatDate(r.requested_at)}</td>
                <td>
                    <div class="action-buttons" style="flex-wrap:wrap;">
                        ${actions}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterRequests() {
    loadRequests();
}

function openAddRequestModal() {
    document.getElementById('requestModalTitle').textContent = 'New Blood Request';
    document.getElementById('requestForm').reset();
    document.getElementById('requestId').value = '';
    document.getElementById('saveRequestBtn').textContent = 'Submit Request';
    openModal('requestModal');
}

function editRequest(id) {
    const req = requestsData.find(r => r.id === id);
    if (!req) return;

    document.getElementById('requestModalTitle').textContent = 'Edit Blood Request';
    document.getElementById('requestId').value = req.id;
    document.getElementById('requestPatient').value = req.patient_name;
    document.getElementById('requestHospital').value = req.hospital_name;
    document.getElementById('requestBloodGroup').value = req.blood_group;
    document.getElementById('requestUnits').value = req.units_needed;
    document.getElementById('requestUrgency').value = req.urgency;
    document.getElementById('requestContact').value = req.contact_person || '';
    document.getElementById('requestPhone').value = req.contact_phone || '';
    document.getElementById('requestReason').value = req.reason || '';
    document.getElementById('saveRequestBtn').textContent = 'Update Request';

    openModal('requestModal');
}

async function saveRequest() {
    const id = document.getElementById('requestId').value;
    const requestData = {
        patient_name: document.getElementById('requestPatient').value.trim(),
        hospital_name: document.getElementById('requestHospital').value.trim(),
        blood_group: document.getElementById('requestBloodGroup').value,
        units_needed: parseInt(document.getElementById('requestUnits').value),
        urgency: document.getElementById('requestUrgency').value,
        contact_person: document.getElementById('requestContact').value.trim(),
        contact_phone: document.getElementById('requestPhone').value.trim(),
        reason: document.getElementById('requestReason').value.trim()
    };

    if (!requestData.patient_name || !requestData.hospital_name || !requestData.blood_group || !requestData.units_needed) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const url = id ? `/api/requests/${id}` : '/api/requests';
    const method = id ? 'PUT' : 'POST';

    const result = await apiCall(url, {
        method,
        body: JSON.stringify(requestData)
    });

    if (result && result.ok) {
        showToast(id ? 'Request updated successfully' : 'Blood request submitted', 'success');
        closeModal('requestModal');
        loadRequests();
    } else if (result) {
        showToast(result.data.error || 'Failed to save request', 'error');
    }
}

async function updateRequestStatus(id, status) {
    const actionText = status === 'fulfilled' ? 'fulfill (this will deduct blood units from inventory)' : status;
    
    if (!confirm(`Are you sure you want to ${actionText} this request?`)) {
        return;
    }

    const result = await apiCall(`/api/requests/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    });

    if (result && result.ok) {
        showToast(`Request ${status} successfully`, 'success');
        loadRequests();
        // Refresh inventory if fulfilled
        if (status === 'fulfilled') {
            loadInventory();
        }
    } else if (result) {
        showToast(result.data.error || `Failed to ${status} request`, 'error');
    }
}

async function deleteRequest(id) {
    if (!confirm('Are you sure you want to delete this request?')) return;

    const result = await apiCall(`/api/requests/${id}`, { method: 'DELETE' });

    if (result && result.ok) {
        showToast('Request deleted', 'success');
        loadRequests();
    } else if (result) {
        showToast(result.data.error || 'Failed to delete request', 'error');
    }
}
