import { createTool } from '@voltagent/core'
import { z } from 'zod'
import { db } from '../db/client.js'

export const fundQueryTool = createTool({
  name: 'fund_query',
  description: '查询基金基本信息，包括基金代码、名称、基金经理、风险等级等',
  parameters: z.object({
    code: z.string().optional().describe('基金代码，如 000001'),
    name: z.string().optional().describe('基金名称关键词，如 华夏成长'),
    manager: z.string().optional().describe('基金经理姓名'),
    limit: z.number().default(10).describe('返回结果数量限制'),
  }),
  execute: async ({ code, name, manager, limit }) => {
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (code) {
      conditions.push(`code = $${paramIndex++}`)
      params.push(code)
    }

    if (name) {
      conditions.push(`(name ILIKE $${paramIndex} OR short_name ILIKE $${paramIndex})`)
      params.push(`%${name}%`)
      paramIndex++
    }

    if (manager) {
      conditions.push(`fund_manager ILIKE $${paramIndex++}`)
      params.push(`%${manager}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT id, code, name, short_name, fund_manager, risk_level,
             fund_type, nav_start_date, nav_frequency, update_time
      FROM fund_profile
      ${whereClause}
      ORDER BY code
      LIMIT $${paramIndex}
    `
    params.push(limit)

    const result = await db.query(query, params)

    if (result.rows.length === 0) {
      return { found: false, message: '未找到匹配的基金' }
    }

    return {
      found: true,
      count: result.rows.length,
      funds: result.rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        shortName: row.short_name,
        manager: row.fund_manager || '未知',
        riskLevel: row.risk_level,
        fundType: row.fund_type,
        navStartDate: row.nav_start_date,
        navFrequency: row.nav_frequency === 'D' ? '日频' : row.nav_frequency,
      })),
    }
  },
})

export const fundNavTool = createTool({
  name: 'fund_nav',
  description: '查询基金净值和收益数据，包括最新净值、各期收益率',
  parameters: z.object({
    code: z.string().describe('基金代码'),
  }),
  execute: async ({ code }) => {
    // Get fund info
    const fundResult = await db.query(
      'SELECT id, name, short_name, nav_start_date FROM fund_profile WHERE code = $1',
      [code]
    )

    if (fundResult.rows.length === 0) {
      return { found: false, message: `未找到代码为 ${code} 的基金` }
    }

    const fund = fundResult.rows[0]

    // Get latest NAV
    const latestResult = await db.query(
      `SELECT nav_date, unit_nav, accumulated_nav
       FROM fund_nav WHERE fund_id = $1
       ORDER BY nav_date DESC LIMIT 1`,
      [fund.id]
    )

    if (latestResult.rows.length === 0) {
      return {
        found: true,
        fund: { code, name: fund.name, shortName: fund.short_name },
        message: '暂无净值数据',
      }
    }

    const latest = latestResult.rows[0]
    const latestNav = parseFloat(latest.unit_nav)
    const latestDate = latest.nav_date

    // Calculate returns for different periods
    const periods = [
      { name: '近1周', days: 7 },
      { name: '近1月', days: 30 },
      { name: '近3月', days: 90 },
      { name: '近6月', days: 180 },
      { name: '近1年', days: 365 },
    ]

    const returns: Record<string, string> = {}

    for (const period of periods) {
      const pastResult = await db.query(
        `SELECT unit_nav FROM fund_nav
         WHERE fund_id = $1 AND nav_date <= $2::date - interval '${period.days} days'
         ORDER BY nav_date DESC LIMIT 1`,
        [fund.id, latestDate]
      )

      if (pastResult.rows.length > 0) {
        const pastNav = parseFloat(pastResult.rows[0].unit_nav)
        const returnRate = ((latestNav - pastNav) / pastNav * 100).toFixed(2)
        returns[period.name] = `${returnRate}%`
      } else {
        returns[period.name] = '数据不足'
      }
    }

    // Get inception return (since nav_start_date)
    const inceptionResult = await db.query(
      `SELECT unit_nav FROM fund_nav
       WHERE fund_id = $1
       ORDER BY nav_date ASC LIMIT 1`,
      [fund.id]
    )

    if (inceptionResult.rows.length > 0) {
      const inceptionNav = parseFloat(inceptionResult.rows[0].unit_nav)
      const inceptionReturn = ((latestNav - inceptionNav) / inceptionNav * 100).toFixed(2)
      returns['成立以来'] = `${inceptionReturn}%`
    }

    // Get total NAV records count
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM fund_nav WHERE fund_id = $1',
      [fund.id]
    )

    // Get recent 5 NAV for trend
    const recentResult = await db.query(
      `SELECT nav_date, unit_nav FROM fund_nav
       WHERE fund_id = $1 ORDER BY nav_date DESC LIMIT 5`,
      [fund.id]
    )

    return {
      found: true,
      fund: {
        code,
        name: fund.name,
        shortName: fund.short_name,
        navStartDate: fund.nav_start_date,
      },
      latestNav: {
        date: latestDate,
        unitNav: latestNav,
        accumulatedNav: parseFloat(latest.accumulated_nav),
      },
      returns,
      totalRecords: parseInt(countResult.rows[0].count),
      recentNavs: recentResult.rows.map((r) => ({
        date: r.nav_date,
        nav: parseFloat(r.unit_nav),
      })),
    }
  },
})

export const fundComparisonTool = createTool({
  name: 'fund_comparison',
  description: '对比多只基金的基本信息、最新净值和收益',
  parameters: z.object({
    codes: z.array(z.string()).min(2).max(5).describe('要对比的基金代码列表'),
  }),
  execute: async ({ codes }) => {
    const comparison = await Promise.all(
      codes.map(async (code) => {
        // Get fund profile
        const profileResult = await db.query(
          'SELECT id, code, name, short_name, fund_manager, risk_level FROM fund_profile WHERE code = $1',
          [code]
        )

        if (profileResult.rows.length === 0) {
          return { code, found: false }
        }

        const fund = profileResult.rows[0]

        // Get latest NAV
        const navResult = await db.query(
          `SELECT nav_date, unit_nav, accumulated_nav
           FROM fund_nav WHERE fund_id = $1
           ORDER BY nav_date DESC LIMIT 1`,
          [fund.id]
        )

        const latestNav = navResult.rows[0]
        const latestUnitNav = latestNav ? parseFloat(latestNav.unit_nav) : null

        // Get 1-year return
        let yearReturn = null
        if (latestNav) {
          const yearAgoResult = await db.query(
            `SELECT unit_nav FROM fund_nav
             WHERE fund_id = $1 AND nav_date <= $2::date - interval '365 days'
             ORDER BY nav_date DESC LIMIT 1`,
            [fund.id, latestNav.nav_date]
          )
          if (yearAgoResult.rows.length > 0) {
            const yearAgoNav = parseFloat(yearAgoResult.rows[0].unit_nav)
            yearReturn = ((latestUnitNav! - yearAgoNav) / yearAgoNav * 100).toFixed(2) + '%'
          }
        }

        return {
          code: fund.code,
          name: fund.short_name || fund.name,
          manager: fund.fund_manager || '未知',
          riskLevel: fund.risk_level,
          latestNav: latestUnitNav,
          navDate: latestNav?.nav_date || null,
          yearReturn,
          found: true,
        }
      })
    )

    const found = comparison.filter((c) => c.found)
    const notFound = comparison.filter((c) => !c.found).map((c) => c.code)

    return {
      found: found.length > 0,
      comparison: found,
      notFoundCodes: notFound.length > 0 ? notFound : undefined,
    }
  },
})
