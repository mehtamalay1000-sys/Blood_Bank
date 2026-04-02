// ══════════════════════════════════════════
// Blood Camps Page Logic
// ══════════════════════════════════════════

let campsData = [];

async function loadCamps() {
    const status = document.getElementById('campStatusFilter')?.value || '';
    let url = '/api/camps';
    if (status) url += `?status=${status}`;

    const result = await apiCall(url);
    if (!result || !result.ok) return;

    campsData = result.data.camps;
    renderCampsGrid();
}

function renderCampsGrid() {
    const grid = document.getElementById('campsGrid');

    if (!campsData || campsData.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <div class="empty-icon">🏕️</div>
                <h3>No blood camps found</h3>
                <p>Create a new camp to organize a blood donation drive.</p>
            </div>`;
        return;
    }

    grid.innerHTML = campsData.map(camp => {
        const campDate = new Date(camp.camp_date);
        const dateStr = campDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        
        let timeStr = '';
        if (camp.start_time && camp.end_time) {
            timeStr = ` • ${camp.start_time.slice(0, 5)} - ${camp.end_time.slice(0, 5)}`;
        }

        return `
            <div class="camp-card">
                <div class="camp-date">📅 ${dateStr}${timeStr}</div>
                <h4>${camp.camp_name}</h4>
                <div class="camp-location">📍 ${camp.location}</div>
                ${camp.organizer ? `<div style="font-size:13px; color: var(--gray-600); margin-bottom:4px;">🏢 ${camp.organizer}</div>` : ''}
                ${camp.description ? `<p style="font-size:13px; color: var(--gray-500); margin-top:8px; line-height:1.5;">${camp.description.substring(0, 100)}${camp.description.length > 100 ? '...' : ''}</p>` : ''}
                <div class="camp-meta">
                    <div>
                        ${getStatusBadge(camp.status)}
                    </div>
                    <div style="font-size:12px; color: var(--gray-500);">
                        👥 ${camp.actual_donors || 0}/${camp.expected_donors || 0} donors
                    </div>
                </div>
                <div class="action-buttons mt-2" style="justify-content:flex-end;">
                    <button class="btn btn-sm btn-secondary" onclick="editCamp(${camp.id})" title="Edit">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteCamp(${camp.id})" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function filterCamps() {
    loadCamps();
}

function openAddCampModal() {
    document.getElementById('campModalTitle').textContent = 'Create Blood Camp';
    document.getElementById('campForm').reset();
    document.getElementById('campId').value = '';
    document.getElementById('campStatusGroup').style.display = 'none';
    document.getElementById('saveCampBtn').textContent = 'Create Camp';
    openModal('campModal');
}

function editCamp(id) {
    const camp = campsData.find(c => c.id === id);
    if (!camp) return;

    document.getElementById('campModalTitle').textContent = 'Edit Blood Camp';
    document.getElementById('campId').value = camp.id;
    document.getElementById('campName').value = camp.camp_name;
    document.getElementById('campLocation').value = camp.location;
    document.getElementById('campDate').value = camp.camp_date ? camp.camp_date.split('T')[0] : '';
    document.getElementById('campExpectedDonors').value = camp.expected_donors || 0;
    document.getElementById('campStartTime').value = camp.start_time || '';
    document.getElementById('campEndTime').value = camp.end_time || '';
    document.getElementById('campOrganizer').value = camp.organizer || '';
    document.getElementById('campPhone').value = camp.contact_phone || '';
    document.getElementById('campDescription').value = camp.description || '';
    document.getElementById('campStatus').value = camp.status;
    document.getElementById('campStatusGroup').style.display = 'block';
    document.getElementById('saveCampBtn').textContent = 'Update Camp';

    openModal('campModal');
}

async function saveCamp() {
    const id = document.getElementById('campId').value;
    const campData = {
        camp_name: document.getElementById('campName').value.trim(),
        location: document.getElementById('campLocation').value.trim(),
        camp_date: document.getElementById('campDate').value,
        expected_donors: parseInt(document.getElementById('campExpectedDonors').value) || 0,
        start_time: document.getElementById('campStartTime').value || null,
        end_time: document.getElementById('campEndTime').value || null,
        organizer: document.getElementById('campOrganizer').value.trim(),
        contact_phone: document.getElementById('campPhone').value.trim(),
        description: document.getElementById('campDescription').value.trim(),
        status: document.getElementById('campStatus').value || 'upcoming',
        actual_donors: 0
    };

    if (!campData.camp_name || !campData.location || !campData.camp_date) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const url = id ? `/api/camps/${id}` : '/api/camps';
    const method = id ? 'PUT' : 'POST';

    const result = await apiCall(url, {
        method,
        body: JSON.stringify(campData)
    });

    if (result && result.ok) {
        showToast(id ? 'Camp updated successfully' : 'Camp created successfully', 'success');
        closeModal('campModal');
        loadCamps();
    } else if (result) {
        showToast(result.data.error || 'Failed to save camp', 'error');
    }
}

async function deleteCamp(id) {
    if (!confirm('Are you sure you want to delete this camp?')) return;

    const result = await apiCall(`/api/camps/${id}`, { method: 'DELETE' });

    if (result && result.ok) {
        showToast('Camp deleted', 'success');
        loadCamps();
    } else if (result) {
        showToast(result.data.error || 'Failed to delete camp', 'error');
    }
}
