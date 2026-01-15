import { Agent } from '@voltagent/core'
import { getModel, type ModelProvider } from '../config/models.js'
import { createFundAnalystAgent } from './fund-analyst.js'

export function createSupervisorAgent(provider: ModelProvider = 'deepseek') {
  const fundAnalyst = createFundAnalystAgent(provider)

  return new Agent({
    name: 'Research Supervisor',
    model: getModel(provider),
    instructions: `你是 Mellivora Mind Studio 的研究主管。

你的职责是：
1. 理解用户的研究需求
2. 将复杂任务分解为子任务
3. 协调专业Agent完成任务
4. 整合结果，给出完整回答

可用的专业Agent：
- Fund Analyst：基金分析师，负责基金信息查询和分析

工作流程：
1. 分析用户问题，判断需要哪些Agent协作
2. 依次调用相关Agent获取信息
3. 整合各Agent的输出，形成完整回答
4. 用清晰的结构呈现给用户

注意事项：
- 保持专业客观
- 信息要有数据支撑
- 不确定的地方要说明`,
    subAgents: [fundAnalyst],
  })
}
