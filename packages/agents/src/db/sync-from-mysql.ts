import mysql from 'mysql2/promise'
import { db, initDatabase } from './client.js'

const mysqlConfig = {
  host: 'rm-bp1o6we7s3o1h76x1to.mysql.rds.aliyuncs.com',
  user: 'wc',
  password: 'Abcd1234#',
  port: 3306,
  database: 'ratel-mind-prod',
}

async function createTables() {
  const client = await db.connect()
  try {
    // Drop old funds table and create new fund_profile table
    await client.query(`
      DROP TABLE IF EXISTS fund_nav CASCADE;
      DROP TABLE IF EXISTS fund_profile CASCADE;
      DROP TABLE IF EXISTS funds CASCADE;
    `)

    await client.query(`
      CREATE TABLE fund_profile (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        short_name VARCHAR(100),
        code VARCHAR(50) UNIQUE NOT NULL,
        fund_manager VARCHAR(100),
        launch_date DATE,
        status SMALLINT DEFAULT 1,
        risk_level SMALLINT DEFAULT 3,
        fund_operation_type VARCHAR(50),
        fund_nature VARCHAR(50),
        is_index_type VARCHAR(50),
        fund_investment_style VARCHAR(50),
        fund_type_code VARCHAR(50),
        fund_type SMALLINT DEFAULT 1,
        nav_start_date DATE,
        nav_frequency VARCHAR(1),
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE fund_nav (
        fund_id BIGINT NOT NULL,
        nav_date DATE NOT NULL,
        unit_nav DECIMAL(18,6),
        accumulated_nav DECIMAL(18,6),
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (fund_id, nav_date)
      )
    `)

    // Create indexes
    await client.query(`
      CREATE INDEX idx_fund_profile_code ON fund_profile(code);
      CREATE INDEX idx_fund_profile_name ON fund_profile USING gin(to_tsvector('simple', name));
      CREATE INDEX idx_fund_nav_date ON fund_nav(nav_date);
    `)

    console.log('Tables created successfully')
  } finally {
    client.release()
  }
}

async function syncData() {
  console.log('Connecting to MySQL...')
  const mysqlConn = await mysql.createConnection(mysqlConfig)

  const pgClient = await db.connect()

  try {
    // Sync fund_profile
    console.log('\nSyncing fund_profile...')
    const [profiles] = await mysqlConn.query('SELECT * FROM fund_profile')
    const profileList = profiles as any[]

    let profileCount = 0
    for (const p of profileList) {
      await pgClient.query(
        `INSERT INTO fund_profile
         (id, name, short_name, code, fund_manager, launch_date, status, risk_level,
          fund_operation_type, fund_nature, is_index_type, fund_investment_style,
          fund_type_code, fund_type, nav_start_date, nav_frequency, create_time, update_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.name, p.short_name, p.code, p.fund_manager, p.launch_date,
          p.status, p.risk_level, p.fund_operation_type, p.fund_nature,
          p.is_index_type, p.fund_investment_style, p.fund_type_code, p.fund_type,
          p.nav_start_date, p.nav_frequency, p.create_time, p.update_time
        ]
      )
      profileCount++
      if (profileCount % 50 === 0) {
        console.log(`  Synced ${profileCount} profiles...`)
      }
    }
    console.log(`  Total: ${profileCount} fund profiles synced`)

    // Sync fund_nav in batches
    console.log('\nSyncing fund_nav (this may take a while)...')
    const batchSize = 1000
    let offset = 0
    let navCount = 0

    while (true) {
      const [navs] = await mysqlConn.query(
        `SELECT * FROM fund_nav ORDER BY fund_id, nav_date LIMIT ${batchSize} OFFSET ${offset}`
      )
      const navList = navs as any[]

      if (navList.length === 0) break

      // Batch insert
      const values: any[] = []
      const placeholders: string[] = []
      let paramIdx = 1

      for (const n of navList) {
        placeholders.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5})`)
        values.push(n.fund_id, n.nav_date, n.unit_nav, n.accumulated_nav, n.create_time, n.update_time)
        paramIdx += 6
      }

      await pgClient.query(
        `INSERT INTO fund_nav (fund_id, nav_date, unit_nav, accumulated_nav, create_time, update_time)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (fund_id, nav_date) DO NOTHING`,
        values
      )

      navCount += navList.length
      offset += batchSize
      console.log(`  Synced ${navCount} nav records...`)
    }

    console.log(`  Total: ${navCount} nav records synced`)

  } finally {
    pgClient.release()
    await mysqlConn.end()
  }
}

async function main() {
  try {
    await createTables()
    await syncData()
    console.log('\n✓ Sync completed successfully!')
  } catch (error) {
    console.error('Sync failed:', error)
  } finally {
    await db.end()
  }
}

main()
