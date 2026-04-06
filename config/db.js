const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection config
const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };

const pgPool = new Pool(poolConfig);

// Helper to convert MySQL queries to PostgreSQL syntax
function translateSql(sql) {
    let index = 1;
    // Replace ? with $1, $2 (this simplistic approach works for standard queries)
    let pgSql = sql.replace(/\?/g, () => `$${index++}`);
    return pgSql;
}

// Wrapper mimicking mysql2/promise behavior
const wrapper = {
    query: async (sql, params) => {
        let isInsert = sql.trim().toUpperCase().startsWith('INSERT');
        let isUpdate = sql.trim().toUpperCase().startsWith('UPDATE');
        let isDelete = sql.trim().toUpperCase().startsWith('DELETE');
        
        let pgSql = translateSql(sql);
        
        // Postgres needs RETURNING to get newly inserted ID
        if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
            pgSql += ' RETURNING id';
        }
        
        const result = await pgPool.query(pgSql, params || []);
        
        if (isInsert) {
            return [{ insertId: result.rows.length > 0 ? result.rows[0].id : null, affectedRows: result.rowCount }];
        } else if (isUpdate || isDelete) {
            return [{ affectedRows: result.rowCount }];
        } else {
            return [result.rows, result.fields]; // [rows] structure
        }
    },
    getConnection: async () => {
        const client = await pgPool.connect();
        return {
            beginTransaction: async () => client.query('BEGIN'),
            query: async (sql, params) => {
                let isInsert = sql.trim().toUpperCase().startsWith('INSERT');
                let isUpdate = sql.trim().toUpperCase().startsWith('UPDATE');
                let isDelete = sql.trim().toUpperCase().startsWith('DELETE');
                
                let pgSql = translateSql(sql);
                
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

// Test connection
pgPool.connect((err, client, release) => {
    if (err) {
        console.error('❌ PostgreSQL connection error:', err.message);
    } else {
        console.log('✅ PostgreSQL connected successfully');
        if(release) release();
    }
});

module.exports = wrapper;
module.exports.pgPool = pgPool;
