const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

// GET /api/inventory - Get blood inventory
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM blood_inventory ORDER BY blood_group');
        res.json({ inventory: rows });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/inventory/donate - Record a new donation
router.post('/donate', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { donor_id, donation_date, units, blood_group, notes } = req.body;

        if (!donor_id || !donation_date || !blood_group) {
            return res.status(400).json({ error: 'Required fields: donor_id, donation_date, blood_group' });
        }

        const donationUnits = units || 1;

        // Insert donation record
        await connection.query(
            'INSERT INTO donations (donor_id, donation_date, units, blood_group, notes) VALUES (?, ?, ?, ?, ?)',
            [donor_id, donation_date, donationUnits, blood_group, notes || null]
        );

        // Update blood inventory
        await connection.query(
            'UPDATE blood_inventory SET units_available = units_available + ? WHERE blood_group = ?',
            [donationUnits, blood_group]
        );

        // Update donor's last donation date and count
        await connection.query(
            'UPDATE donors SET last_donation_date = ?, total_donations = total_donations + 1 WHERE id = ?',
            [donation_date, donor_id]
        );

        await connection.commit();
        res.status(201).json({ message: 'Donation recorded successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Record donation error:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

// PUT /api/inventory/donation/:id/status - Update donation status
router.put('/donation/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['collected', 'tested', 'stored', 'used', 'expired'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Get current donation info
        const [donation] = await pool.query('SELECT * FROM donations WHERE id = ?', [req.params.id]);
        if (donation.length === 0) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        const oldStatus = donation[0].status;

        // If marking as used or expired, decrease inventory
        if ((status === 'used' || status === 'expired') && oldStatus === 'stored') {
            await pool.query(
                'UPDATE blood_inventory SET units_available = GREATEST(0, units_available - ?) WHERE blood_group = ?',
                [donation[0].units, donation[0].blood_group]
            );
        }

        await pool.query('UPDATE donations SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Donation status updated' });
    } catch (error) {
        console.error('Update donation status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/inventory/donations - Get all donations
router.get('/donations', async (req, res) => {
    try {
        const { status, blood_group } = req.query;
        let query = `SELECT d.*, dn.full_name as donor_name 
                      FROM donations d 
                      JOIN donors dn ON d.donor_id = dn.id 
                      WHERE 1=1`;
        const params = [];

        if (status) {
            query += ' AND d.status = ?';
            params.push(status);
        }
        if (blood_group) {
            query += ' AND d.blood_group = ?';
            params.push(blood_group);
        }

        query += ' ORDER BY d.donation_date DESC LIMIT 100';

        const [rows] = await pool.query(query, params);
        res.json({ donations: rows });
    } catch (error) {
        console.error('Get donations error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
