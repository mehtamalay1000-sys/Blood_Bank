const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

// GET /api/camps - Get all camps
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM blood_camps WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY camp_date DESC';

        const [rows] = await pool.query(query, params);
        res.json({ camps: rows });
    } catch (error) {
        console.error('Get camps error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/camps/:id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM blood_camps WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Camp not found' });
        }
        res.json({ camp: rows[0] });
    } catch (error) {
        console.error('Get camp error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/camps - Create new camp
router.post('/', async (req, res) => {
    try {
        const { camp_name, location, camp_date, start_time, end_time, organizer, contact_phone, expected_donors, description } = req.body;

        if (!camp_name || !location || !camp_date) {
            return res.status(400).json({ error: 'Required: camp_name, location, camp_date' });
        }

        const [result] = await pool.query(
            `INSERT INTO blood_camps (camp_name, location, camp_date, start_time, end_time, organizer, contact_phone, expected_donors, description) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [camp_name, location, camp_date, start_time || null, end_time || null, organizer || null, contact_phone || null, expected_donors || 0, description || null]
        );

        res.status(201).json({ message: 'Camp created successfully', campId: result.insertId });
    } catch (error) {
        console.error('Create camp error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/camps/:id - Update camp
router.put('/:id', async (req, res) => {
    try {
        const { camp_name, location, camp_date, start_time, end_time, organizer, contact_phone, expected_donors, actual_donors, status, description } = req.body;

        const [result] = await pool.query(
            `UPDATE blood_camps SET camp_name=?, location=?, camp_date=?, start_time=?, end_time=?, 
             organizer=?, contact_phone=?, expected_donors=?, actual_donors=?, status=?, description=? WHERE id=?`,
            [camp_name, location, camp_date, start_time, end_time, organizer, contact_phone, expected_donors, actual_donors, status, description, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Camp not found' });
        }
        res.json({ message: 'Camp updated successfully' });
    } catch (error) {
        console.error('Update camp error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/camps/:id/status - Update camp status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const [result] = await pool.query(
            'UPDATE blood_camps SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Camp not found' });
        }
        res.json({ message: `Camp marked as ${status}` });
    } catch (error) {
        console.error('Update camp status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/camps/:id
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM blood_camps WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Camp not found' });
        }
        res.json({ message: 'Camp deleted successfully' });
    } catch (error) {
        console.error('Delete camp error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
