const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Middleware: require user to be logged in
function requireUser(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

router.use(requireUser);

// ─── GET /api/user/dashboard — User dashboard stats ───
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;

        // My blood requests count
        const [myRequests] = await pool.query(
            'SELECT COUNT(*) as total FROM blood_requests WHERE requested_by = ?', [userId]
        );

        // My pending requests
        const [pendingRequests] = await pool.query(
            'SELECT COUNT(*) as total FROM blood_requests WHERE requested_by = ? AND status = "pending"', [userId]
        );

        // My fulfilled requests
        const [fulfilledRequests] = await pool.query(
            'SELECT COUNT(*) as total FROM blood_requests WHERE requested_by = ? AND status = "fulfilled"', [userId]
        );

        // My camp registrations
        const [myCamps] = await pool.query(
            'SELECT COUNT(*) as total FROM camp_registrations WHERE user_id = ?', [userId]
        );

        // Total available blood units
        const [bloodUnits] = await pool.query(
            'SELECT SUM(units_available) as total FROM blood_inventory'
        );

        // Upcoming camps count
        const [upcomingCamps] = await pool.query(
            'SELECT COUNT(*) as total FROM blood_camps WHERE status = "upcoming"'
        );

        res.json({
            myRequests: myRequests[0].total,
            pendingRequests: pendingRequests[0].total,
            fulfilledRequests: fulfilledRequests[0].total,
            myCamps: myCamps[0].total,
            totalBloodUnits: bloodUnits[0].total || 0,
            upcomingCamps: upcomingCamps[0].total
        });
    } catch (error) {
        console.error('User dashboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── GET /api/user/inventory — Blood availability ───
router.get('/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM blood_inventory ORDER BY blood_group');
        res.json({ inventory: rows });
    } catch (error) {
        console.error('User inventory error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── POST /api/user/request-blood — Submit blood request ───
router.post('/request-blood', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { patient_name, hospital_name, blood_group, units_needed, urgency, contact_phone, reason } = req.body;

        if (!patient_name || !hospital_name || !blood_group || !units_needed) {
            return res.status(400).json({ error: 'Required: patient_name, hospital_name, blood_group, units_needed' });
        }

        const [result] = await pool.query(
            `INSERT INTO blood_requests (patient_name, hospital_name, blood_group, units_needed, urgency, contact_person, contact_phone, reason, requested_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [patient_name, hospital_name, blood_group, parseInt(units_needed), urgency || 'normal',
             req.session.user.full_name, contact_phone || null, reason || null, userId]
        );

        res.status(201).json({ message: 'Blood request submitted successfully', requestId: result.insertId });
    } catch (error) {
        console.error('User request blood error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── GET /api/user/my-requests — User's blood requests ───
router.get('/my-requests', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [rows] = await pool.query(
            'SELECT * FROM blood_requests WHERE requested_by = ? ORDER BY requested_at DESC',
            [userId]
        );
        res.json({ requests: rows });
    } catch (error) {
        console.error('User my-requests error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── GET /api/user/camps — Upcoming camps ───
router.get('/camps', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [camps] = await pool.query(
            `SELECT c.*, 
             (SELECT COUNT(*) FROM camp_registrations cr WHERE cr.camp_id = c.id) as registered_count,
             (SELECT COUNT(*) FROM camp_registrations cr WHERE cr.camp_id = c.id AND cr.user_id = ?) as is_registered
             FROM blood_camps c 
             WHERE c.status IN ('upcoming', 'ongoing')
             ORDER BY c.camp_date ASC`,
            [userId]
        );
        res.json({ camps });
    } catch (error) {
        console.error('User camps error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── POST /api/user/camps/:id/register — Register for a camp ───
router.post('/camps/:id/register', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const campId = req.params.id;

        // Check camp exists and is upcoming/ongoing
        const [camp] = await pool.query(
            'SELECT * FROM blood_camps WHERE id = ? AND status IN ("upcoming", "ongoing")',
            [campId]
        );
        if (camp.length === 0) {
            return res.status(404).json({ error: 'Camp not found or not available for registration' });
        }

        // Register
        await pool.query(
            'INSERT INTO camp_registrations (user_id, camp_id) VALUES (?, ?)',
            [userId, campId]
        );

        res.status(201).json({ message: 'Successfully registered for the camp!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'You are already registered for this camp' });
        }
        console.error('Camp register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── DELETE /api/user/camps/:id/register — Cancel registration ───
router.delete('/camps/:id/register', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const campId = req.params.id;

        const [result] = await pool.query(
            'DELETE FROM camp_registrations WHERE user_id = ? AND camp_id = ?',
            [userId, campId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        res.json({ message: 'Camp registration cancelled' });
    } catch (error) {
        console.error('Camp unregister error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── GET /api/user/my-camps — User's registered camps ───
router.get('/my-camps', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [camps] = await pool.query(
            `SELECT c.*, cr.registered_at,
             (SELECT COUNT(*) FROM camp_registrations cr2 WHERE cr2.camp_id = c.id) as registered_count
             FROM camp_registrations cr 
             JOIN blood_camps c ON cr.camp_id = c.id 
             WHERE cr.user_id = ?
             ORDER BY c.camp_date ASC`,
            [userId]
        );
        res.json({ camps });
    } catch (error) {
        console.error('User my-camps error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
