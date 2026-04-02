// ══════════════════════════════════════════
// Donor Management Page Logic
// ══════════════════════════════════════════

let donorsData = [];
let searchTimeout = null;

async function loadDonors() {
    const search = document.getElementById('donorSearch')?.value || '';
    const blood_group = document.getElementById('donorBloodFilter')?.value || '';
    const status = document.getElementById('donorStatusFilter')?.value || '';

    let url = '/api/donors?limit=100';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (blood_group) url += `&blood_group=${encodeURIComponent(blood_group)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;

    const result = await apiCall(url);
    if (!result || !result.ok) return;

    donorsData = result.data.donors;
    renderDonorsTable();
}

function renderDonorsTable() {
    const tbody = document.getElementById('donorsTableBody');

    if (!donorsData || donorsData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon">👤</div>
                        <h3>No donors found</h3>
                        <p>Add your first donor or adjust your search filters.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = donorsData.map(d => `
        <tr>
            <td>
                <strong>${d.full_name}</strong>
                ${d.email ? `<br><small class="text-muted">${d.email}</small>` : ''}
            </td>
            <td><span class="blood-badge">${d.blood_group}</span></td>
            <td>${d.phone}</td>
            <td>${d.city || '-'}</td>
            <td>${d.total_donations || 0}</td>
            <td>${formatDate(d.last_donation_date)}</td>
            <td>${getStatusBadge(d.status)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-secondary btn-icon" onclick="editDonor(${d.id})" title="Edit">✏️</button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteDonor(${d.id}, '${d.full_name}')" title="Delete">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function searchDonors() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadDonors(), 300);
}

function filterDonors() {
    loadDonors();
}

function openAddDonorModal() {
    document.getElementById('donorModalTitle').textContent = 'Add New Donor';
    document.getElementById('donorForm').reset();
    document.getElementById('donorId').value = '';
    document.getElementById('donorStatusGroup').style.display = 'none';
    document.getElementById('saveDonorBtn').textContent = 'Save Donor';
    openModal('donorModal');
}

function editDonor(id) {
    const donor = donorsData.find(d => d.id === id);
    if (!donor) return;

    document.getElementById('donorModalTitle').textContent = 'Edit Donor';
    document.getElementById('donorId').value = donor.id;
    document.getElementById('donorName').value = donor.full_name;
    document.getElementById('donorEmail').value = donor.email || '';
    document.getElementById('donorPhone').value = donor.phone;
    document.getElementById('donorGender').value = donor.gender;
    document.getElementById('donorDOB').value = donor.date_of_birth ? donor.date_of_birth.split('T')[0] : '';
    document.getElementById('donorBloodGroup').value = donor.blood_group;
    document.getElementById('donorCity').value = donor.city || '';
    document.getElementById('donorAddress').value = donor.address || '';
    document.getElementById('donorMedicalNotes').value = donor.medical_notes || '';
    document.getElementById('donorStatus').value = donor.status;
    document.getElementById('donorStatusGroup').style.display = 'block';
    document.getElementById('saveDonorBtn').textContent = 'Update Donor';

    openModal('donorModal');
}

async function saveDonor() {
    const id = document.getElementById('donorId').value;
    const donorData = {
        full_name: document.getElementById('donorName').value.trim(),
        email: document.getElementById('donorEmail').value.trim(),
        phone: document.getElementById('donorPhone').value.trim(),
        gender: document.getElementById('donorGender').value,
        date_of_birth: document.getElementById('donorDOB').value,
        blood_group: document.getElementById('donorBloodGroup').value,
        city: document.getElementById('donorCity').value.trim(),
        address: document.getElementById('donorAddress').value.trim(),
        medical_notes: document.getElementById('donorMedicalNotes').value.trim(),
        status: document.getElementById('donorStatus').value || 'active'
    };

    if (!donorData.full_name || !donorData.phone || !donorData.gender || !donorData.date_of_birth || !donorData.blood_group) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const url = id ? `/api/donors/${id}` : '/api/donors';
    const method = id ? 'PUT' : 'POST';

    const result = await apiCall(url, {
        method,
        body: JSON.stringify(donorData)
    });

    if (result && result.ok) {
        showToast(id ? 'Donor updated successfully' : 'Donor added successfully', 'success');
        closeModal('donorModal');
        loadDonors();
        loadDonorsList(); // refresh dropdown cache
    } else if (result) {
        showToast(result.data.error || 'Failed to save donor', 'error');
    }
}

async function deleteDonor(id, name) {
    if (!confirm(`Are you sure you want to delete donor "${name}"? This will also delete their donation records.`)) {
        return;
    }

    const result = await apiCall(`/api/donors/${id}`, { method: 'DELETE' });

    if (result && result.ok) {
        showToast('Donor deleted successfully', 'success');
        loadDonors();
        loadDonorsList();
    } else if (result) {
        showToast(result.data.error || 'Failed to delete donor', 'error');
    }
}
