// 用户配置类型定义
export interface UserConfig {
  // 薪资范围
  salaryMin: number;
  salaryMax: number;

  // 公司黑名单
  companyBlacklist: string[];

  // 公司规模范围
  companySizeMin: number;  // 最小人数
  companySizeMax: number;  // 最大人数

  // 工作内容关键字
  keywordsInclude: string[];
  keywordsExclude: string[];

  // 学历要求
  educationLevel: EducationLevel[];

  // Boss活跃度阈值（小时）
  bossActiveHours: number;

  // 是否启用自动投递
  autoApplyEnabled: boolean;

  // 自动投递间隔（秒）
  autoApplyInterval: number;
}

// 学历等级
export type EducationLevel = '不限' | '大专' | '本科' | '硕士' | '博士';

// AI模型配置
export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type AIProvider = 'qwen' | 'deepseek' | 'kimi' | 'baidu' | 'zhipu';

export const AI_PROVIDER_CONFIG: Record<AIProvider, { name: string; baseUrl: string; models: string[] }> = {
  qwen: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  kimi: {
    name: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
  baidu: {
    name: '文心一言',
    baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
    models: ['eb-instant', 'eb', 'eb-4'],
  },
  zhipu: {
    name: '智谱AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4', 'glm-4-flash', 'glm-3-turbo'],
  },
};

// 职位信息
export interface JobInfo {
  id: string;
  title: string;
  salary: string;
  salaryMin: number;
  salaryMax: number;
  company: string;
  companySize: string;
  companySizeNum: number;
  education: string;
  experience: string;
  location: string;
  bossName: string;
  bossTitle: string;
  bossActiveTime: string;
  bossActiveHours: number;  // 转换后的活跃小时数
  jobDescription: string;
  url: string;
}

// 默认配置
export const DEFAULT_CONFIG: UserConfig = {
  salaryMin: 0,
  salaryMax: 0,  // 0 表示不限
  companyBlacklist: [],
  companySizeMin: 0,
  companySizeMax: 0,  // 0 表示不限
  keywordsInclude: [],
  keywordsExclude: [],
  educationLevel: ['不限', '大专', '本科', '硕士', '博士'],
  bossActiveHours: 0,  // 0 表示不限
  autoApplyEnabled: false,
  autoApplyInterval: 5,
};

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'deepseek',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
};