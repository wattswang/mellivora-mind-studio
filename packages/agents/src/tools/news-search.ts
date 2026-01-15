import { createTool } from '@voltagent/core'
import { z } from 'zod'
import { db } from '../db/client.js'

// 使用 DuckDuckGo 搜索（免费，无需 API key）
async function searchDuckDuckGo(query: string, limit: number = 10) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    const html = await response.text()

    // 简单解析搜索结果
    const results: { title: string; url: string; snippet: string }[] = []
    const regex = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/g

    let match
    while ((match = regex.exec(html)) !== null && results.length < limit) {
      results.push({
        url: match[1],
        title: match[2].trim(),
        snippet: match[3].trim(),
      })
    }

    // 备用解析方式
    if (results.length === 0) {
      const titleRegex = /<a[^>]+class="result__a"[^>]*>([^<]+)<\/a>/g
      const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g

      const titles: string[] = []
      const snippets: string[] = []

      while ((match = titleRegex.exec(html)) !== null) {
        titles.push(match[1].trim())
      }
      while ((match = snippetRegex.exec(html)) !== null) {
        snippets.push(match[1].replace(/<[^>]+>/g, '').trim())
      }

      for (let i = 0; i < Math.min(titles.length, snippets.length, limit); i++) {
        results.push({
          title: titles[i] || '',
          url: '',
          snippet: snippets[i] || '',
        })
      }
    }

    return results
  } catch (error) {
    console.error('DuckDuckGo search error:', error)
    return []
  }
}

export const newsSearchTool = createTool({
  name: 'news_search',
  description: '搜索基金、市场相关的最新新闻和资讯',
  parameters: z.object({
    query: z.string().describe('搜索关键词，如"易方达蓝筹 最新消息"'),
    fundCode: z.string().optional().describe('关联的基金代码'),
    limit: z.number().default(5).describe('返回结果数量'),
  }),
  execute: async ({ query, fundCode, limit }) => {
    // 添加财经关键词优化搜索
    const searchQuery = `${query} 基金 财经 site:eastmoney.com OR site:sina.com.cn OR site:10jqka.com.cn`

    const results = await searchDuckDuckGo(searchQuery, limit)

    if (results.length === 0) {
      return {
        found: false,
        message: '未找到相关新闻',
        query,
      }
    }

    // 可选：保存到数据库做历史分析
    if (fundCode) {
      try {
        for (const item of results) {
          await db.query(
            `INSERT INTO news_cache (fund_code, title, url, snippet, search_query, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT DO NOTHING`,
            [fundCode, item.title, item.url, item.snippet, query]
          )
        }
      } catch (e) {
        // 表可能不存在，忽略
      }
    }

    return {
      found: true,
      query,
      count: results.length,
      news: results.map((item) => ({
        title: item.title,
        snippet: item.snippet,
        url: item.url,
      })),
    }
  },
})

export const newsAnalysisTool = createTool({
  name: 'news_analysis',
  description: '获取指定基金的历史新闻和舆情分析',
  parameters: z.object({
    fundCode: z.string().describe('基金代码'),
    days: z.number().default(30).describe('查询最近多少天的新闻'),
  }),
  execute: async ({ fundCode, days }) => {
    try {
      const result = await db.query(
        `SELECT title, snippet, url, created_at
         FROM news_cache
         WHERE fund_code = $1
           AND created_at > NOW() - INTERVAL '${days} days'
         ORDER BY created_at DESC
         LIMIT 20`,
        [fundCode]
      )

      if (result.rows.length === 0) {
        return {
          found: false,
          message: `最近 ${days} 天没有该基金的新闻记录，请先使用 news_search 搜索`,
        }
      }

      return {
        found: true,
        fundCode,
        period: `最近 ${days} 天`,
        count: result.rows.length,
        news: result.rows,
      }
    } catch (error) {
      return {
        found: false,
        message: '新闻缓存表不存在，请先使用 news_search 搜索新闻',
      }
    }
  },
})
