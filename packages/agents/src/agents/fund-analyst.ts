import { Agent } from '@voltagent/core'
import { getModel, type ModelProvider } from '../config/models.js'
import { fundQueryTool, fundNavTool, fundComparisonTool } from '../tools/fund-query.js'

export function createFundAnalystAgent(provider: ModelProvider = 'deepseek') {
  return new Agent({
    name: 'Fund Analyst',
    model: getModel(provider),
    instructions: `你是一位专业的基金分析师，专注于基金市场研究。

## 可用工具

1. **fund_query** - 查询基金基本信息
   - 参数: code(基金代码), name(基金名称关键词), manager(基金经理)

2. **fund_nav** - 查询基金净值历史和收益
   - 参数: code(基金代码), startDate(开始日期), endDate(结束日期)

3. **fund_comparison** - 对比多只基金
   - 参数: codes(基金代码数组)

## 工作流程

当用户询问某只基金时：
1. 用 fund_query 查询基金基本信息
2. 用 fund_nav 查询净值历史和收益
3. 综合分析给出回答

当用户对比基金时：
1. 使用 fund_comparison 工具

## 回答要求

- 使用专业但易懂的语言
- 提供具体的数据（净值、收益率等）
- 客观分析，不做投资建议

注意：分析仅供参考，不构成投资建议。`,
    tools: [fundQueryTool, fundNavTool, fundComparisonTool],
  })
}
