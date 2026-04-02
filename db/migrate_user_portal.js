const pool = require('../config/db');

async function migrate() {
    try {
        // 1. Update users role ENUM to include 'user'
        await pool.query(`ALTER TABLE users MODIFY COLUMN role ENUM('admin','staff','user') DEFAULT 'user'`);
        console.log('1. users role ENUM updated (added "user", default="user")');

        // 2. Add requested_by column to blood_requests
        try {
            await pool.query(`ALTER TABLE blood_requests ADD COLUMN requested_by INT NULL`);
            await pool.query(`ALTER TABLE blood_requests ADD CONSTRAINT fk_requested_by FOREIGN KEY (requested_by) REFERENCES users(id)`);
            console.log('2. blood_requests.requested_by column added');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('2. blood_requests.requested_by already exists, skipping');
            } else {
                throw e;
            }
        }

        // 3. Create camp_registrations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS camp_registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                camp_id INT NOT NULL,
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (camp_id) REFERENCES blood_camps(id) ON DELETE CASCADE,
                UNIQUE KEY unique_reg (user_id, camp_id)
            )
        `);
        console.log('3. camp_registrations table created');

        console.log('\n✅ All migrations complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exit(1);
    }
}

migrate();
