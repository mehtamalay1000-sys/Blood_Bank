const postgres = require('postgres');
const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config();

// Force IPv4 first - fixes ENOTFOUND on Node.js v17+ with Supabase
dns.setDefaultResultOrder('ipv4first');

const connectionString = process.env.DATABASE_URL;

// ── Supabase-recommended driver (postgres.js) for all queries ──
const sql = postgres(connectionString, {
    ssl: 'require',
    connection: {
        options: '--cluster=supabase'  // recommended by Supabase
    }
});

// ── pg Pool (kept ONLY for connect-pg-simple session store) ──
const pgPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

// Helper to convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
function translateSql(sqlStr) {
    let index = 1;
    return sqlStr.replace(/\?/g, () => `$${index++}`);
}

// Wrapper mimicking mysql2/promise behavior so all routes work unchanged
const wrapper = {
    query: async (sqlStr, params) => {
        let isInsert = sqlStr.trim().toUpperCase().startsWith('INSERT');
        let isUpdate = sqlStr.trim().toUpperCase().startsWith('UPDATE');
        let isDelete = sqlStr.trim().toUpperCase().startsWith('DELETE');

        let pgSql = translateSql(sqlStr);

        // Postgres needs RETURNING to get newly inserted ID
        if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
            pgSql += ' RETURNING id';
        }

        const result = await sql.unsafe(pgSql, params || []);

        if (isInsert) {
            return [{ insertId: result.length > 0 ? result[0].id : null, affectedRows: result.count }];
        } else if (isUpdate || isDelete) {
            return [{ affectedRows: result.count }];
        } else {
            return [result]; // [rows] structure
        }
    },

    getConnection: async () => {
        // Use pg Pool for transaction support (connection-based transactions)
        const client = await pgPool.connect();
        return {
            beginTransaction: async () => client.query('BEGIN'),
            query: async (sqlStr, params) => {
                let isInsert = sqlStr.trim().toUpperCase().startsWith('INSERT');
                let isUpdate = sqlStr.trim().toUpperCase().startsWith('UPDATE');
                let isDelete = sqlStr.trim().toUpperCase().startsWith('DELETE');

                let pgSql = translateSql(sqlStr);

                if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
                    pgSql += ' RETURNING id';
                }

                const result = await client.query(pgSql, params || []);

                if (isInsert) {
                    return [{ insertId: result.rows.length > 0 ? result.rows[0].id : null, affectedRows: result.rowCount }];
                } else if (isUpdate || isDelete) {
                    return [{ affectedRows: result.rowCount }];
                } else {
                    return [result.rows, result.fields];
                }
            },
            commit: async () => client.query('COMMIT'),
            rollback: async () => client.query('ROLLBACK'),
            release: () => client.release()
        };
    }
};

// Test connection using postgres.js
sql`SELECT 1 AS ok`
    .then(() => console.log('✅ PostgreSQL connected successfully (postgres.js)'))
    .catch(err => console.error('❌ PostgreSQL connection error:', err.message));

module.exports = wrapper;
module.exports.pgPool = pgPool;
