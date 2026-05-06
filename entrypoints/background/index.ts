import { JobInfo, UserConfig, AIConfig } from '../../utils/types';
import { getUserConfig, getAIConfig, getResume, addApplyHistory } from '../../utils/storage';

// 存储当前页面职位信息
let currentJobs: JobInfo[] = [];

// 随机延迟函数
function randomDelay(min: number, max: number): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

// 批量投递状态
let batchApplyStatus: {
  isRunning: boolean;
  currentIndex: number;
  total: number;
  successCount: number;
  failCount: number;
  lastError: string;
} = {
  isRunning: false,
  currentIndex: 0,
  total: 0,
  successCount: 0,
  failCount: 0,
  lastError: '',
};

// 批量投递
async function startBatchApply(jobs: JobInfo[]): Promise<void> {
  if (batchApplyStatus.isRunning) {
    console.log('[批量投递] 已有投递任务正在进行');
    return;
  }

  batchApplyStatus = {
    isRunning: true,
    currentIndex: 0,
    total: jobs.length,
    successCount: 0,
    failCount: 0,
    lastError: '',
  };

  console.log('[批量投递] 开始批量投递，共', jobs.length, '个职位');

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    batchApplyStatus.currentIndex = i + 1;
    console.log(`[批量投递] 正在处理第 ${i + 1}/${jobs.length} 个: ${job.title} - ${job.company}`);

    try {
      // 1. 生成问候语
      const greeting = await generateGreeting(job);
      console.log('[批量投递] 问候语生成完成');

      // 2. 打开详情页标签（不激活，后台打开）
      const tab = await chrome.tabs.create({ url: job.url, active: false });
      console.log('[批量投递] 打开详情页:', tab.id);

      // 3. 等待页面加载（随机 2-4 秒）
      await randomDelay(2000, 4000);

      // 4. 发送消息给详情页 Content Script
      try {
        const result = await chrome.tabs.sendMessage(tab.id!, { type: 'SEND_GREETING', greeting });
        console.log('[批量投递] 发送结果:', result);

        if (result?.success) {
          batchApplyStatus.successCount++;
          // 记录投递历史
          await addApplyHistory({
            jobId: job.id,
            jobTitle: job.title,
            company: job.company,
            appliedAt: Date.now(),
            greeting: greeting,
          });
          console.log('[批量投递] 投递成功，已记录历史');
        } else {
          batchApplyStatus.failCount++;
          batchApplyStatus.lastError = result?.message || '发送失败';
          console.log('[批量投递] 发送失败:', result?.message);
        }
      } catch (msgError) {
        batchApplyStatus.failCount++;
        batchApplyStatus.lastError = String(msgError);
        console.log('[批量投递] 消息发送失败:', msgError);
      }

      // 5. 关闭详情页标签
      await chrome.tabs.remove(tab.id!);
      console.log('[批量投递] 关闭详情页');

      // 6. 随机延迟 5-10 秒（防检测）
      if (i < jobs.length - 1) {
        const delayTime = 5000 + Math.random() * 5000;
        console.log(`[批量投递] 等待 ${Math.round(delayTime / 1000)} 秒后处理下一个...`);
        await new Promise(resolve => setTimeout(resolve, delayTime));
      }
    } catch (error) {
      batchApplyStatus.failCount++;
      batchApplyStatus.lastError = String(error);
      console.log('[批量投递] 处理失败:', error);
    }
  }

  batchApplyStatus.isRunning = false;
  console.log(`[批量投递] 完成！成功: ${batchApplyStatus.successCount}, 失败: ${batchApplyStatus.failCount}`);
}

// 筛选职位
function filterJob(job: JobInfo, config: UserConfig): boolean {
  // 薪资筛选
  if (job.salaryMin < config.salaryMin || job.salaryMax > config.salaryMax) {
    return false;
  }

  // 公司黑名单
  if (config.companyBlacklist.some((name) => job.company.includes(name))) {
    return false;
  }

  // 公司规模
  if (job.companySizeNum < config.companySizeMin || job.companySizeNum > config.companySizeMax) {
    return false;
  }

  // 学历筛选
  if (!config.educationLevel.some((level) => job.education.includes(level))) {
    return false;
  }

  // Boss活跃度
  const activeHours = parseBossActiveTime(job.bossActiveTime);
  if (activeHours > config.bossActiveHours) {
    return false;
  }

  // 关键字包含
  if (config.keywordsInclude.length > 0) {
    const hasKeyword = config.keywordsInclude.some((keyword) =>
      job.jobDescription.includes(keyword) || job.title.includes(keyword)
    );
    if (!hasKeyword) return false;
  }

  // 关键字排除
  if (config.keywordsExclude.some((keyword) =>
    job.jobDescription.includes(keyword) || job.title.includes(keyword)
  )) {
    return false;
  }

  return true;
}

// 解析Boss活跃时间
function parseBossActiveTime(timeStr: string): number {
  if (timeStr.includes('刚刚') || timeStr.includes('今日')) return 0;
  if (timeStr.includes('3日')) return 72;
  if (timeStr.includes('本周')) return 168;
  if (timeStr.includes('2周')) return 336;
  if (timeStr.includes('月')) return 720;
  return 9999;
}

// 获取筛选后的职位
async function getFilteredJobs(): Promise<JobInfo[]> {
  const config = await getUserConfig();
  return currentJobs.filter((job) => filterJob(job, config));
}

// AI 生成问候语
async function generateGreeting(job: JobInfo): Promise<string> {
  const aiConfig = await getAIConfig();
  const resume = await getResume();

  if (!aiConfig.apiKey) {
    return `您好，我对贵公司的${job.title}职位很感兴趣，希望能有机会进一步沟通。`;
  }

  const prompt = `
你是一个求职者，正在向HR打招呼。
职位信息：
- 职位名称：${job.title}
- 公司名称：${job.company}
- 职位描述：${job.jobDescription}
- 薪资：${job.salary}

求职者简历摘要：
${resume || '未提供简历'}

请生成一段简短、专业、有针对性的打招呼内容（不超过100字）。
直接输出打招呼内容，不要有任何额外说明。
`;

  try {
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '您好，我对这个职位很感兴趣，希望能有机会沟通。';
  } catch (error) {
    console.error('生成问候语失败:', error);
    return `您好，我对贵公司的${job.title}职位很感兴趣，希望能有机会进一步沟通。`;
  }
}

// AI 自动回复消息
async function generateReply(message: string, job: JobInfo): Promise<string> {
  const aiConfig = await getAIConfig();
  const resume = await getResume();

  if (!aiConfig.apiKey) {
    return '感谢您的回复，我很期待能有机会详细了解这个职位。';
  }

  const prompt = `
你是一个求职者，正在回复HR的消息。
职位信息：${job.title} at ${job.company}
求职者简历：${resume || '未提供简历'}

HR消息：${message}

请生成一段简短、专业、礼貌的回复（不超过50字）。
直接输出回复内容，不要有任何额外说明。
`;

  try {
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '感谢您的回复。';
  } catch (error) {
    console.error('生成回复失败:', error);
    return '感谢您的回复，我很期待能有机会详细了解这个职位。';
  }
}

// Background Service Worker 入口
export default defineBackground(() => {
  console.log('[智能求职助手] Background 已启动');

  // 监听来自 Content Script 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'LOG':
        // 接收来自 Content Script 的日志
        console.log('[Content Script]', message.data);
        break;

      case 'LOG_ERROR':
        console.error('[Content Script Error]', message.data);
        break;

      case 'JOBS_UPDATED':
        currentJobs = message.data;
        console.log('[职位数据] 已更新:', currentJobs.length, '个职位');
        // 打印第一个职位信息用于调试
        if (currentJobs.length > 0) {
          console.log('[职位示例]', currentJobs[0]);
        }
        break;

      case 'GET_FILTERED_JOBS':
        getFilteredJobs().then((jobs) => {
          console.log('[筛选结果] 符合条件的职位:', jobs.length);
          sendResponse(jobs);
        });
        return true;

      case 'GENERATE_GREETING':
        generateGreeting(message.data).then((greeting) => {
          console.log('[问候语生成]', greeting);
          sendResponse(greeting);
        });
        return true;

      case 'GENERATE_REPLY':
        generateReply(message.message, message.job).then((reply) => {
          console.log('[回复生成]', reply);
          sendResponse(reply);
        });
        return true;

      case 'APPLY_JOB':
        // 记录投递历史
        addApplyHistory({
          jobId: message.job.id,
          jobTitle: message.job.title,
          company: message.job.company,
          appliedAt: Date.now(),
          greeting: message.greeting,
        });
        console.log('[投递记录]', message.job.title, '-', message.job.company);
        sendResponse({ success: true });
        break;

      case 'START_BATCH_APPLY':
        startBatchApply(message.jobs).then(() => {
          sendResponse({
            success: true,
            status: batchApplyStatus,
          });
        });
        return true;

      case 'GET_BATCH_STATUS':
        sendResponse(batchApplyStatus);
        break;
    }

    return true;
  });
});