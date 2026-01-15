import { db } from './client.js'

async function check() {
  // Find fund
  const fund = await db.query(
    "SELECT id, code, name, short_name FROM fund_profile WHERE name LIKE '%瑞锐%' OR short_name LIKE '%瑞锐%'"
  )
  console.log('Found funds:', fund.rows)

  if (fund.rows.length > 0) {
    for (const f of fund.rows) {
      // Check NAV data count
      const nav = await db.query(
        'SELECT COUNT(*) as count FROM fund_nav WHERE fund_id = $1',
        [f.id]
      )
      console.log(`\nFund ${f.code} (${f.short_name}):`)
      console.log('  NAV records:', nav.rows[0].count)

      // Get latest NAV
      const latest = await db.query(
        'SELECT nav_date, unit_nav, accumulated_nav FROM fund_nav WHERE fund_id = $1 ORDER BY nav_date DESC LIMIT 5',
        [f.id]
      )
      console.log('  Latest NAV:', latest.rows)
    }
  }

  await db.end()
}

check()
