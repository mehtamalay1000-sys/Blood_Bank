const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        // Total donors
        const [donorCount] = await pool.query('SELECT COUNT(*) as total FROM donors WHERE status = "active"');
        
        // Total blood units
        const [bloodUnits] = await pool.query('SELECT SUM(units_available) as total FROM blood_inventory');
        
        // Pending requests
        const [pendingRequests] = await pool.query('SELECT COUNT(*) as total FROM blood_requests WHERE status = "pending"');
        
        // Upcoming camps
        const [upcomingCamps] = await pool.query('SELECT COUNT(*) as total FROM blood_camps WHERE status = "upcoming"');
        
        // Total donations this month
        const [monthlyDonations] = await pool.query(
            'SELECT COUNT(*) as total FROM donations WHERE EXTRACT(MONTH FROM donation_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM donation_date) = EXTRACT(YEAR FROM CURRENT_DATE)'
        );

        // Critical requests
        const [criticalRequests] = await pool.query(
            'SELECT COUNT(*) as total FROM blood_requests WHERE urgency = "critical" AND status = "pending"'
        );

        res.json({
            totalDonors: donorCount[0].total,
            totalBloodUnits: bloodUnits[0].total || 0,
            pendingRequests: pendingRequests[0].total,
            upcomingCamps: upcomingCamps[0].total,
            monthlyDonations: monthlyDonations[0].total,
            criticalRequests: criticalRequests[0].total
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/dashboard/inventory-chart - Blood group availability
router.get('/inventory-chart', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT blood_group, units_available FROM blood_inventory ORDER BY blood_group');
        res.json({ data: rows });
    } catch (error) {
        console.error('Inventory chart error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/dashboard/recent-donations - Recent donation activity
router.get('/recent-donations', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT d.*, dn.full_name as donor_name 
             FROM donations d 
             JOIN donors dn ON d.donor_id = dn.id 
             ORDER BY d.donation_date DESC 
             LIMIT 10`
        );
        res.json({ donations: rows });
    } catch (error) {
        console.error('Recent donations error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/dashboard/recent-requests - Recent blood requests
router.get('/recent-requests', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM blood_requests 
             ORDER BY CASE urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, requested_at DESC 
             LIMIT 10`
        );
        res.json({ requests: rows });
    } catch (error) {
        console.error('Recent requests error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
