import { UserConfig, AIConfig, DEFAULT_CONFIG, DEFAULT_AI_CONFIG } from './types';

// Chrome Storage API 封装
const storage = chrome.storage.local;

// 获取用户配置
export async function getUserConfig(): Promise<UserConfig> {
  const result = await storage.get('userConfig');
  return result.userConfig || DEFAULT_CONFIG;
}

// 保存用户配置
export async function saveUserConfig(config: UserConfig): Promise<void> {
  await storage.set({ userConfig: config });
}

// 获取AI配置
export async function getAIConfig(): Promise<AIConfig> {
  const result = await storage.get('aiConfig');
  return result.aiConfig || DEFAULT_AI_CONFIG;
}

// 保存AI配置
export async function saveAIConfig(config: AIConfig): Promise<void> {
  await storage.set({ aiConfig: config });
}

// 获取简历内容
export async function getResume(): Promise<string> {
  const result = await storage.get('resume');
  return result.resume || '';
}

// 保存简历内容
export async function saveResume(resume: string): Promise<void> {
  await storage.set({ resume });
}

// 获取投递历史
export interface ApplyHistoryItem {
  jobId: string;
  jobTitle: string;
  company: string;
  appliedAt: number;
  greeting: string;
}

export async function getApplyHistory(): Promise<ApplyHistoryItem[]> {
  const result = await storage.get('applyHistory');
  return result.applyHistory || [];
}

export async function addApplyHistory(item: ApplyHistoryItem): Promise<void> {
  const history = await getApplyHistory();
  history.push(item);
  await storage.set({ applyHistory });
}

export async function clearApplyHistory(): Promise<void> {
  await storage.set({ applyHistory: [] });
}

// 清除所有数据
export async function clearAllData(): Promise<void> {
  await storage.clear();
}