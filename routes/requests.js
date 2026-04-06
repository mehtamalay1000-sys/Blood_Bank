const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

// GET /api/requests - Get all blood requests
router.get('/', async (req, res) => {
    try {
        const { status, urgency, blood_group } = req.query;
        let query = 'SELECT * FROM blood_requests WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (urgency) {
            query += ' AND urgency = ?';
            params.push(urgency);
        }
        if (blood_group) {
            query += ' AND blood_group = ?';
            params.push(blood_group);
        }

        query += " ORDER BY CASE urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, requested_at DESC";

        const [rows] = await pool.query(query, params);
        res.json({ requests: rows });
    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/requests/:id - Get single request
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM blood_requests WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        res.json({ request: rows[0] });
    } catch (error) {
        console.error('Get request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/requests - Create new blood request
router.post('/', async (req, res) => {
    try {
        const { patient_name, hospital_name, blood_group, units_needed, urgency, contact_person, contact_phone, reason, notes } = req.body;

        if (!patient_name || !hospital_name || !blood_group || !units_needed) {
            return res.status(400).json({ error: 'Required: patient_name, hospital_name, blood_group, units_needed' });
        }

        const [result] = await pool.query(
            `INSERT INTO blood_requests (patient_name, hospital_name, blood_group, units_needed, urgency, contact_person, contact_phone, reason, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [patient_name, hospital_name, blood_group, units_needed, urgency || 'normal', contact_person || null, contact_phone || null, reason || null, notes || null]
        );

        res.status(201).json({ message: 'Blood request created', requestId: result.insertId });
    } catch (error) {
        console.error('Create request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/requests/:id - Update request
router.put('/:id', async (req, res) => {
    try {
        const { patient_name, hospital_name, blood_group, units_needed, urgency, contact_person, contact_phone, reason, notes } = req.body;

        const [result] = await pool.query(
            `UPDATE blood_requests SET patient_name=?, hospital_name=?, blood_group=?, units_needed=?, urgency=?, 
             contact_person=?, contact_phone=?, reason=?, notes=? WHERE id=?`,
            [patient_name, hospital_name, blood_group, units_needed, urgency, contact_person, contact_phone, reason, notes, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        res.json({ message: 'Request updated successfully' });
    } catch (error) {
        console.error('Update request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/requests/:id/status - Update request status
router.put('/:id/status', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { status } = req.body;
        const validStatuses = ['pending', 'approved', 'fulfilled', 'rejected'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Get request details
        const [request] = await connection.query('SELECT * FROM blood_requests WHERE id = ?', [req.params.id]);
        if (request.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // If fulfilling, decrease inventory
        if (status === 'fulfilled') {
            const [inventory] = await connection.query(
                'SELECT units_available FROM blood_inventory WHERE blood_group = ?',
                [request[0].blood_group]
            );
            
            if (inventory.length === 0 || inventory[0].units_available < request[0].units_needed) {
                await connection.rollback();
                return res.status(400).json({ error: 'Insufficient blood units in inventory' });
            }

            await connection.query(
                'UPDATE blood_inventory SET units_available = units_available - ? WHERE blood_group = ?',
                [request[0].units_needed, request[0].blood_group]
            );

            await connection.query(
                'UPDATE blood_requests SET status = ?, fulfilled_at = NOW() WHERE id = ?',
                [status, req.params.id]
            );
        } else {
            await connection.query(
                'UPDATE blood_requests SET status = ? WHERE id = ?',
                [status, req.params.id]
            );
        }

        await connection.commit();
        res.json({ message: `Request ${status} successfully` });
    } catch (error) {
        await connection.rollback();
        console.error('Update request status error:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

// DELETE /api/requests/:id - Delete request
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM blood_requests WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        res.json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Delete request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
