const { mysqlPool } = require('./db');

const migrate = async () => {
    const colors = {
        reset: "\x1b[0m",
        green: "\x1b[32m",
        red: "\x1b[31m",
        cyan: "\x1b[36m",
        yellow: "\x1b[33m"
    };

    console.log(`${colors.cyan}🚀 Initiating Professional Database Migration...${colors.reset}`);

    const conn = await mysqlPool.getConnection();

    try {
        // ─── STAGE 1: TABLE CREATION ──────────────────────────────────────────────
        console.log(`${colors.cyan}📦 Stage 1: Creating Foundational Tables...${colors.reset}`);

        const tableQueries = [
            `CREATE TABLE IF NOT EXISTS splits_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                image LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS \`splits_groups\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES splits_users(id) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS splits_group_members (
                group_id INT,
                user_id INT,
                last_seen_message_id VARCHAR(255),
                PRIMARY KEY (group_id, user_id),
                FOREIGN KEY (group_id) REFERENCES \`splits_groups\`(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES splits_users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS splits_expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT,
                paid_by INT,
                amount DECIMAL(15, 2) NOT NULL,
                description VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES \`splits_groups\`(id) ON DELETE CASCADE,
                FOREIGN KEY (paid_by) REFERENCES splits_users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS splits_expense_splits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                expense_id INT,
                user_id INT,
                amount DECIMAL(15, 2) NOT NULL,
                FOREIGN KEY (expense_id) REFERENCES splits_expenses(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES splits_users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS splits_activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                action VARCHAR(255) NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES splits_users(id) ON DELETE SET NULL
            )`
        ];

        for (const query of tableQueries) {
            await conn.query(query);
        }
        console.log(`${colors.green}✔ Stage 1 Complete: Structural Integrity Verified.${colors.reset}`);

        // ─── STAGE 2: COLUMN EVOLUTION (SELF-HEALING) ─────────────────────────────
        console.log(`${colors.cyan}🛠 Stage 2: Synchronizing Schema Columns...${colors.reset}`);

        // Check splits_users for 'image'
        const [usersCols] = await conn.query('SHOW COLUMNS FROM splits_users');
        if (!usersCols.find(c => c.Field === 'image')) {
            console.log(`${colors.yellow}⚡ Patching: Adding "image" to splits_users${colors.reset}`);
            await conn.query('ALTER TABLE splits_users ADD COLUMN image LONGTEXT DEFAULT NULL');
        }

        // Check splits_group_members for 'last_seen_message_id'
        const [membersCols] = await conn.query('SHOW COLUMNS FROM splits_group_members');
        if (!membersCols.find(c => c.Field === 'last_seen_message_id')) {
            console.log(`${colors.yellow}⚡ Patching: Adding "last_seen_message_id" to splits_group_members${colors.reset}`);
            await conn.query('ALTER TABLE splits_group_members ADD COLUMN last_seen_message_id VARCHAR(255) DEFAULT NULL');
        }

        // Check splits_users for 'role'
        if (!usersCols.find(c => c.Field === 'role')) {
            console.log(`${colors.yellow}⚡ Patching: Adding "role" to splits_users${colors.reset}`);
            await conn.query("ALTER TABLE splits_users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user'");
        }

        console.log(`${colors.green}✔ Stage 2 Complete: All Columns Synchronized.${colors.reset}`);

        // ─── STAGE 3: DATA SEEDING (ADMIN ACCOUNT) ─────────────────────────────
        console.log(`${colors.cyan}🌱 Stage 3: Seeding Essential Records...${colors.reset}`);
        
        const adminEmail = 'admin@admin.com';
        const [existingAdmin] = await conn.query('SELECT id FROM splits_users WHERE email = ?', [adminEmail]);

        if (existingAdmin.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('Admin@123', 10);
            await conn.query(
                'INSERT INTO splits_users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['System Administrator', adminEmail, hashedPassword, 'admin']
            );
            console.log(`${colors.green}✔ Root Administrator Created: ${adminEmail}${colors.reset}`);
        } else {
            console.log(`${colors.yellow}ℹ Admin Account Verified: Existing.${colors.reset}`);
        }

        console.log(`${colors.green}✔ Stage 3 Complete: System Records In Sync.${colors.reset}`);
        console.log(`\n${colors.green}✨ DATABASE IS NOW STATE-OF-THE-ART ✨${colors.reset}`);

        conn.release();
        process.exit(0);
    } catch (err) {
        console.error(`${colors.red}✘ Migration Failed: ${err.message}${colors.reset}`);
        if (conn) conn.release();
        process.exit(1);
    }
};

migrate();

