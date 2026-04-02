const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// GET /api/donors - Get all donors with optional filters
router.get('/', async (req, res) => {
    try {
        const { blood_group, status, search, page = 1, limit = 20 } = req.query;
        let query = 'SELECT * FROM donors WHERE 1=1';
        const params = [];

        if (blood_group) {
            query += ' AND blood_group = ?';
            params.push(blood_group);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (search) {
            query += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR city LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC';

        // Count total
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countRows] = await pool.query(countQuery, params);
        const total = countRows[0].total;

        // Pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await pool.query(query, params);

        res.json({
            donors: rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get donors error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/donors/:id - Get single donor
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM donors WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Donor not found' });
        }
        
        // Get donation history
        const [donations] = await pool.query(
            'SELECT * FROM donations WHERE donor_id = ? ORDER BY donation_date DESC',
            [req.params.id]
        );
        
        res.json({ donor: rows[0], donations });
    } catch (error) {
        console.error('Get donor error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/donors - Create new donor
router.post('/', async (req, res) => {
    try {
        const { full_name, email, phone, gender, date_of_birth, blood_group, address, city, medical_notes } = req.body;
        
        if (!full_name || !phone || !gender || !date_of_birth || !blood_group) {
            return res.status(400).json({ error: 'Required fields: full_name, phone, gender, date_of_birth, blood_group' });
        }

        const [result] = await pool.query(
            `INSERT INTO donors (full_name, email, phone, gender, date_of_birth, blood_group, address, city, medical_notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email || null, phone, gender, date_of_birth, blood_group, address || null, city || null, medical_notes || null]
        );

        res.status(201).json({ message: 'Donor added successfully', donorId: result.insertId });
    } catch (error) {
        console.error('Create donor error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/donors/:id - Update donor
router.put('/:id', async (req, res) => {
    try {
        const { full_name, email, phone, gender, date_of_birth, blood_group, address, city, medical_notes, status } = req.body;
        
        const [result] = await pool.query(
            `UPDATE donors SET full_name=?, email=?, phone=?, gender=?, date_of_birth=?, blood_group=?, 
             address=?, city=?, medical_notes=?, status=? WHERE id=?`,
            [full_name, email, phone, gender, date_of_birth, blood_group, address, city, medical_notes, status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        res.json({ message: 'Donor updated successfully' });
    } catch (error) {
        console.error('Update donor error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/donors/:id - Delete donor
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM donors WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        res.json({ message: 'Donor deleted successfully' });
    } catch (error) {
        console.error('Delete donor error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
