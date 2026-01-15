import pg from 'pg'

const LOCAL_DB = 'postgresql://postgres:postgres@localhost:5432/mellivora'
const NEON_DB = 'postgresql://neondb_owner:npg_nCuVO3yE2Rmo@ep-proud-wildflower-a1ggvsfb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

async function syncToNeon() {
  const local = new pg.Pool({ connectionString: LOCAL_DB })
  const neon = new pg.Pool({ connectionString: NEON_DB })

  try {
    // Test connections
    console.log('Testing connections...')
    await local.query('SELECT 1')
    console.log('✓ Local DB connected')
    await neon.query('SELECT 1')
    console.log('✓ Neon DB connected')

    // Create tables in Neon
    console.log('\nCreating tables in Neon...')
    await neon.query(`
      CREATE TABLE IF NOT EXISTS fund_profile (
        id BIGINT PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        name VARCHAR(200),
        short_name VARCHAR(100),
        fund_manager VARCHAR(200),
        risk_level VARCHAR(50),
        fund_type VARCHAR(100),
        nav_start_date DATE,
        nav_frequency VARCHAR(10),
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ fund_profile table created')

    await neon.query(`
      CREATE TABLE IF NOT EXISTS fund_nav (
        fund_id BIGINT,
        nav_date DATE,
        unit_nav NUMERIC(18,6),
        accumulated_nav NUMERIC(18,6),
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (fund_id, nav_date)
      )
    `)
    console.log('✓ fund_nav table created')

    // Sync fund_profile
    console.log('\nSyncing fund_profile...')
    const profiles = await local.query('SELECT * FROM fund_profile')
    console.log(`Found ${profiles.rows.length} profiles`)

    if (profiles.rows.length > 0) {
      // Clear and insert
      await neon.query('TRUNCATE fund_profile CASCADE')

      for (const row of profiles.rows) {
        await neon.query(`
          INSERT INTO fund_profile (id, code, name, short_name, fund_manager, risk_level, fund_type, nav_start_date, nav_frequency, create_time, update_time)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [row.id, row.code, row.name, row.short_name, row.fund_manager, row.risk_level, row.fund_type, row.nav_start_date, row.nav_frequency, row.create_time, row.update_time])
      }
      console.log(`✓ Synced ${profiles.rows.length} fund profiles`)
    }

    // Sync fund_nav in batches
    console.log('\nSyncing fund_nav...')
    const navCount = await local.query('SELECT COUNT(*) as count FROM fund_nav')
    const totalNavs = parseInt(navCount.rows[0].count)
    console.log(`Found ${totalNavs} NAV records`)

    await neon.query('TRUNCATE fund_nav')

    const batchSize = 1000
    let offset = 0
    let synced = 0

    while (offset < totalNavs) {
      const navs = await local.query(`
        SELECT fund_id, nav_date, unit_nav, accumulated_nav, create_time, update_time
        FROM fund_nav
        ORDER BY fund_id, nav_date
        LIMIT $1 OFFSET $2
      `, [batchSize, offset])

      if (navs.rows.length === 0) break

      // Build batch insert
      const values: any[] = []
      const placeholders: string[] = []
      let paramIndex = 1

      for (const row of navs.rows) {
        placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`)
        values.push(row.fund_id, row.nav_date, row.unit_nav, row.accumulated_nav, row.create_time, row.update_time)
      }

      await neon.query(`
        INSERT INTO fund_nav (fund_id, nav_date, unit_nav, accumulated_nav, create_time, update_time)
        VALUES ${placeholders.join(', ')}
      `, values)

      synced += navs.rows.length
      offset += batchSize
      process.stdout.write(`\r✓ Synced ${synced}/${totalNavs} NAV records`)
    }

    console.log('\n\n✅ Sync completed!')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await local.end()
    await neon.end()
  }
}

syncToNeon()
