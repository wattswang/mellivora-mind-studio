import { db } from './client.js'

const sampleFunds = [
  {
    code: '005827',
    name: '易方达蓝筹精选混合',
    type: '混合型',
    manager: '张坤',
    company: '易方达基金',
    size: 67800000000,
    nav: 1.8234,
  },
  {
    code: '161725',
    name: '招商中证白酒指数',
    type: '指数型',
    manager: '侯昊',
    company: '招商基金',
    size: 98500000000,
    nav: 1.2156,
  },
  {
    code: '110011',
    name: '易方达中小盘混合',
    type: '混合型',
    manager: '张坤',
    company: '易方达基金',
    size: 31200000000,
    nav: 5.6789,
  },
  {
    code: '000961',
    name: '天弘沪深300ETF联接A',
    type: '指数型',
    manager: '杨超',
    company: '天弘基金',
    size: 15600000000,
    nav: 1.3456,
  },
  {
    code: '519736',
    name: '交银新成长混合',
    type: '混合型',
    manager: '王崇',
    company: '交银施罗德基金',
    size: 12300000000,
    nav: 2.1234,
  },
  {
    code: '163406',
    name: '兴全合润混合',
    type: '混合型',
    manager: '谢治宇',
    company: '兴证全球基金',
    size: 28900000000,
    nav: 1.9876,
  },
  {
    code: '000001',
    name: '华夏成长混合',
    type: '混合型',
    manager: '蔡向阳',
    company: '华夏基金',
    size: 8700000000,
    nav: 1.4567,
  },
  {
    code: '519069',
    name: '汇添富价值精选混合',
    type: '混合型',
    manager: '劳杰男',
    company: '汇添富基金',
    size: 21500000000,
    nav: 3.2145,
  },
]

export async function seedFunds() {
  const client = await db.connect()
  try {
    for (const fund of sampleFunds) {
      await client.query(
        `INSERT INTO funds (code, name, type, manager, company, size, nav, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           manager = EXCLUDED.manager,
           company = EXCLUDED.company,
           size = EXCLUDED.size,
           nav = EXCLUDED.nav,
           updated_at = NOW()`,
        [fund.code, fund.name, fund.type, fund.manager, fund.company, fund.size, fund.nav]
      )
    }
    console.log(`Seeded ${sampleFunds.length} funds`)
  } finally {
    client.release()
  }
}
