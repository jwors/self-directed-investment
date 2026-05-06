import { JobInfo } from '../../utils/types';

// 动态特征匹配 - 不依赖固定class名，通过内容特征识别元素

// 解析薪资字符串
function parseSalary(salaryStr: string): { min: number; max: number } {
  // 支持多种格式: "10-20K", "10-20K·14薪", "10K以上", "10-20K/月"
  const patterns = [
    /(\d+)[-·](\d+)K/,           // 10-20K
    /(\d+)[-·](\d+)k/,           // 10-20k (小写)
    /(\d+)[.·](\d+)万/,          // 1.2-1.5万
    /(\d+)K以上/,                 // 10K以上
    /(\d+)k以上/,                 // 10k以上
  ];

  for (const pattern of patterns) {
    const match = salaryStr.match(pattern);
    if (match) {
      return { min: Number(match[1]), max: Number(match[2]) || Number(match[1]) };
    }
  }

  // 单个数字格式 "15K"
  const singleMatch = salaryStr.match(/(\d+)K/i);
  if (singleMatch) {
    return { min: Number(singleMatch[1]), max: Number(singleMatch[1]) };
  }

  return { min: 0, max: 0 };
}

// 解析公司规模
function parseCompanySize(sizeStr: string): number {
  const patterns = [
    /(\d+)[-·](\d+)人/,
    /(\d+)人以上/,
    /(\d+)人以下/,
  ];

  for (const pattern of patterns) {
    const match = sizeStr.match(pattern);
    if (match) {
      return Number(match[2]) || Number(match[1]);
    }
  }

  return 0;
}

// 解析Boss活跃时间
function parseBossActiveTime(timeStr: string): number {
  if (/刚刚|今日|今天/.test(timeStr)) return 0;
  if (/3日|三天/.test(timeStr)) return 72;
  if (/本周|7日|一周/.test(timeStr)) return 168;
  if (/2周|两周|14日/.test(timeStr)) return 336;
  if (/月|30日/.test(timeStr)) return 720;
  return 9999;
}

// 通过特征查找薪资元素 - 直接使用 job-salary class
function findSalaryElement(container: Element): { element: Element | null; text: string } {
  // 优先使用 job-salary class
  const salaryEl = container.querySelector('.job-salary');
  if (salaryEl) {
    const text = salaryEl.textContent?.trim() || '';
    if (text) {
      return { element: salaryEl, text };
    }
  }

  // 备选方案：遍历查找薪资格式
  const candidates = container.querySelectorAll('*');
  for (const el of candidates) {
    // 只检查直接文本内容，避免获取整个容器的文本
    if (el.children.length === 0 || el.children.length <= 2) {
      const text = el.textContent?.trim() || '';
      // 匹配薪资格式
      if (/^\d+[-·]\d+K/i.test(text) || /^\d+K/i.test(text) || /^\d+[-·]\d+万/.test(text)) {
        // 确保不是整个卡片的大文本
        if (text.length < 20) {
          return { element: el, text };
        }
      }
    }
  }
  return { element: null, text: '' };
}

// 通过href特征查找职位链接
function findJobLink(container: Element): { element: Element | null; jobId: string; url: string } {
  const links = container.querySelectorAll('a');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    // 匹配职位链接格式: /job_detail/{id}.html
    const jobIdMatch = href.match(/\/job_detail\/([a-zA-Z0-9_-]+)/);
    if (jobIdMatch) {
      return {
        element: link,
        jobId: jobIdMatch[1],
        url: href.startsWith('/') ? `https://www.zhipin.com${href}` : href
      };
    }
  }
  return { element: null, jobId: '', url: '' };
}

// 通过href特征查找公司链接
function findCompanyLink(container: Element): { element: Element | null; companyId: string; name: string } {
  const links = container.querySelectorAll('a');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    // 匹配公司链接格式
    const companyMatch = href.match(/\/gongsi\/(\w+)/);
    if (companyMatch) {
      return {
        element: link,
        companyId: companyMatch[1],
        name: link.textContent?.trim() || ''
      };
    }
  }
  return { element: null, companyId: '', name: '' };
}

// 查找标签类信息（学历、经验等）- 使用 tag-list class
function findTagElements(container: Element): { education: string; experience: string; location: string } {
  const result = { education: '', experience: '', location: '' };

  // 优先使用 tag-list class
  const tagList = container.querySelector('.tag-list');
  if (tagList) {
    const tags = tagList.querySelectorAll('li, span, div');
    for (const tag of tags) {
      const text = tag.textContent?.trim() || '';
      if (!text || text.length > 15) continue;

      // 学历匹配
      if (/本科|硕士|博士|大专|学历不限|高中|中专/.test(text)) {
        result.education = text;
      }
      // 经验匹配
      else if (/经验|应届|实习|\d+[-·]\d+年|\d+年以上/.test(text)) {
        result.experience = text;
      }
    }
    return result;
  }

  // 备选方案：遍历查找
  const candidates = container.querySelectorAll('*');

  for (const el of candidates) {
    if (el.children.length > 0) continue; // 只检查叶子节点

    const text = el.textContent?.trim() || '';
    if (!text || text.length > 15) continue;

    // 学历匹配
    if (/本科|硕士|博士|大专|学历不限|高中|中专/.test(text)) {
      result.education = text;
    }
    // 经验匹配
    else if (/经验|应届|实习|\d+[-·]\d+年|\d+年以上/.test(text)) {
      result.experience = text;
    }
    // 地区匹配（通常包含城市名或区域）
    else if (/^[^0-9]+$/.test(text) && text.length <= 10 && !/本科|硕士|博士/.test(text)) {
      // 可能是地区，但要排除公司名等
      if (!result.location) {
        result.location = text;
      }
    }
  }

  return result;
}

// 查找Boss活跃时间元素 - 使用 job-card-footer 结构
function findBossActiveElement(container: Element): { bossName: string; bossTitle: string; activeTime: string } {
  const result = { bossName: '', bossTitle: '', activeTime: '' };

  // 优先使用 job-card-footer 结构
  const footer = container.querySelector('.job-card-footer');
  if (footer) {
    // Boss 名字
    const bossNameEl = footer.querySelector('.boss-name');
    if (bossNameEl) {
      result.bossName = bossNameEl.textContent?.trim() || '';
    }

    // Boss 活跃时间图标（通常在 boss-online-icon 或类似位置）
    const onlineIcon = footer.querySelector('.boss-online-icon, [class*="online"]');
    if (onlineIcon) {
      // 活跃时间可能在 title 属性或 aria-label 中
      result.activeTime = onlineIcon.getAttribute('title') || onlineIcon.getAttribute('aria-label') || '';
      if (!result.activeTime) {
        // 或者直接取文本
        result.activeTime = onlineIcon.textContent?.trim() || '';
      }
    }

    return result;
  }

  // 备选方案：遍历查找
  const candidates = container.querySelectorAll('*');

  for (const el of candidates) {
    if (el.children.length > 2) continue;

    const text = el.textContent?.trim() || '';
    if (!text) continue;

    // Boss活跃时间匹配
    if (/刚刚|今日|活跃|3日|本周|2周|月/.test(text) && text.length < 20) {
      result.activeTime = text;
    }
    // Boss职位匹配（通常是简短职位名）
    else if (/经理|主管|总监|专员|主管|HR|招聘|人事|CEO|CTO|COO|VP|总监|负责人/.test(text) && text.length < 15) {
      result.bossTitle = text;
    }
  }

  // 查找Boss姓名（通常在活跃时间附近）
  if (result.activeTime) {
    const parentCandidates = container.querySelectorAll('*');
    for (const el of parentCandidates) {
      const text = el.textContent?.trim() || '';
      // Boss姓名通常是2-4个字的中文
      if (/^[\u4e00-\u9fa5]{2,4}$/.test(text) && !result.bossName) {
        result.bossName = text;
      }
    }
  }

  return result;
}

// 查找职位名称 - 使用 job-name class
function findJobTitle(container: Element, jobLink: Element | null): string {
  // 优先使用 job-name class
  const jobNameEl = container.querySelector('.job-name');
  if (jobNameEl) {
    const text = jobNameEl.textContent?.trim() || '';
    if (text) {
      return text;
    }
  }

  // 如果有职位链接，优先从链接文本获取
  if (jobLink) {
    const linkText = jobLink.textContent?.trim();
    if (linkText && linkText.length < 50 && !linkText.includes('K')) {
      return linkText;
    }
    // 查找链接内部的职位名称元素
    const innerElements = jobLink.querySelectorAll('*');
    for (const el of innerElements) {
      const text = el.textContent?.trim();
      if (text && text.length < 50 && !/^\d+K/.test(text)) {
        return text;
      }
    }
  }

  // 从整个容器查找
  const candidates = container.querySelectorAll('*');
  for (const el of candidates) {
    if (el.children.length > 0) continue;
    const text = el.textContent?.trim() || '';
    // 职位名称特征：中文为主，长度适中，不包含薪资
    if (text.length > 5 && text.length < 50 &&
        /^[\u4e00-\u9fa5]/.test(text) &&
        !/K|万|元/.test(text) &&
        !/本科|硕士|博士/.test(text)) {
      return text;
    }
  }

  return '';
}

// 查找职位列表容器
function findJobListContainer(): Element | null {
  // 尝试多种可能的容器选择器
  const candidates = [
    '.job-list-box',
    '[class*="job-list"]',
    '[class*="joblist"]',
    'ul[class*="job"]',
    'div[class*="list"]',
  ];

  for (const selector of candidates) {
    const el = document.querySelector(selector);
    if (el) {
      const jobLinks = el.querySelectorAll('a[href*="/job_detail/"]');
      if (jobLinks.length > 0) {
        return el;
      }
    }
  }

  // 最后尝试：找包含多个职位链接的父容器
  const allJobLinks = document.querySelectorAll('a[href*="/job_detail/"]');
  if (allJobLinks.length > 0) {
    // 找到第一个职位链接的最近公共父容器
    const firstLink = allJobLinks[0];
    let parent = firstLink.parentElement;
    while (parent) {
      const linksInParent = parent.querySelectorAll('a[href*="/job_detail/"]');
      if (linksInParent.length >= allJobLinks.length / 2) {
        return parent;
      }
      parent = parent.parentElement;
    }
  }

  return null;
}

// 从单个职位容器提取信息
function extractJobInfo(container: Element): JobInfo | null {
  try {
    // 查找职位链接
    const jobLinkInfo = findJobLink(container);
    if (!jobLinkInfo.element) {
      return null; // 没有职位链接，跳过
    }

    // 查找薪资
    const salaryInfo = findSalaryElement(container);

    // 查找标签信息（先查找，后面会用到）
    const tags = findTagElements(container);

    // 查找公司
    const companyInfo = findCompanyLink(container);
    // 如果没找到公司链接，尝试从文本获取
    let company = companyInfo.name;
    if (!company) {
      const candidates = container.querySelectorAll('*');
      for (const el of candidates) {
        if (el.children.length > 0) continue;
        const text = el.textContent?.trim() || '';
        // 公司名特征：不含数字K，长度适中，排除学历文本
        if (text.length > 2 && text.length < 30 &&
            !/K|万|元|本科|硕士|博士|经验/.test(text) &&
            !tags.education?.includes(text)) {
          company = text;
          break;
        }
      }
    }

    // 查找Boss信息
    const bossInfo = findBossActiveElement(container);

    // 查找职位名称
    const title = findJobTitle(container, jobLinkInfo.element);

    // 查找公司规模（通常在公司附近或公司详情里）
    let companySize = '';
    let companySizeNum = 0;
    const sizeCandidates = container.querySelectorAll('*');
    for (const el of sizeCandidates) {
      const text = el.textContent?.trim() || '';
      if (/人/.test(text) && /\d/.test(text) && text.length < 20) {
        companySize = text;
        companySizeNum = parseCompanySize(text);
        break;
      }
    }

    return {
      id: jobLinkInfo.jobId,
      title: title || '未知职位',
      salary: salaryInfo.text,
      salaryMin: salaryInfo.text ? parseSalary(salaryInfo.text).min : 0,
      salaryMax: salaryInfo.text ? parseSalary(salaryInfo.text).max : 0,
      company: company || '未知公司',
      companySize,
      companySizeNum,
      education: tags.education,
      experience: tags.experience,
      location: tags.location,
      bossName: bossInfo.bossName,
      bossTitle: bossInfo.bossTitle,
      bossActiveTime: bossInfo.activeTime,
      bossActiveHours: parseBossActiveTime(bossInfo.activeTime),
      jobDescription: '',
      url: jobLinkInfo.url,
    };
  } catch (error) {
    chrome.runtime.sendMessage({ type: 'LOG_ERROR', data: String(error) });
    return null;
  }
}

// 获取所有职位信息
function getAllJobsOnPage(): JobInfo[] {
  const jobs: JobInfo[] = [];

  // 方式1：通过职位链接找到其父容器
  const jobLinks = document.querySelectorAll('a[href*="/job_detail/"]');
  const processedContainers = new Set<Element>();

  jobLinks.forEach((link) => {
    // 找到职位卡片容器（通常是链接的祖父级元素）
    let container = link.parentElement;
    let depth = 0;
    while (container && depth < 5) {
      // 检查是否是一个有效的职位卡片（包含薪资）
      const hasSalary = findSalaryElement(container).text;
      if (hasSalary && !processedContainers.has(container)) {
        processedContainers.add(container);
        const jobInfo = extractJobInfo(container);
        if (jobInfo) {
          jobs.push(jobInfo);
        }
        break;
      }
      container = container.parentElement;
      depth++;
    }
  });

  // 方式2：如果没有找到，尝试通过职位列表容器
  if (jobs.length === 0) {
    const listContainer = findJobListContainer();
    if (listContainer) {
      const children = listContainer.children;
      for (const child of children) {
        const jobInfo = extractJobInfo(child);
        if (jobInfo) {
          jobs.push(jobInfo);
        }
      }
    }
  }

  return jobs;
}

// 监听职位列表变化
function observeJobList(callback: (jobs: JobInfo[]) => void) {
  // 多种可能的列表容器
  const possibleContainers = [
    '.job-list-box',
    '[class*="job-list"]',
    '[class*="list"]',
    'ul',
    'ol',
  ];

  let container: Element | null = null;
  for (const selector of possibleContainers) {
    const el = document.querySelector(selector);
    if (el && el.querySelectorAll('a[href*="/job_detail/"]').length > 0) {
      container = el;
      break;
    }
  }

  if (!container) {
    chrome.runtime.sendMessage({ type: 'LOG', data: '未找到职位列表容器，使用全局监听' });
    // 监听整个body
    container = document.body;
  }

  const observer = new MutationObserver(() => {
    const jobs = getAllJobsOnPage();
    callback(jobs);
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
  });

  // 立即获取当前职位
  const jobs = getAllJobsOnPage();
  callback(jobs);
}

// 发送职位数据到后台
function sendJobsToBackground(jobs: JobInfo[]) {
  chrome.runtime.sendMessage({
    type: 'JOBS_UPDATED',
    data: jobs,
  });
}

// Content Script 入口
export default defineContentScript({
  matches: ['https://www.zhipin.com/*', 'https://zhipin.com/*'],
  runAt: 'document_start',
  main() {
    // 注入反调试保护脚本
    injectAntiDebugScript();

    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initContentScript();
      });
    } else {
      initContentScript();
    }
  },
});

// 注入反调试保护脚本到页面
function injectAntiDebugScript() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      const originalFunctionConstructor = Function.prototype.constructor;
      Function.prototype.constructor = function() {
        if (arguments[0] === 'debugger') {
          return function() {};
        }
        return originalFunctionConstructor.apply(this, arguments);
      };

      let blockedReloads = 0;
      const originalReload = location.reload.bind(location);
      location.reload = function() {
        blockedReloads++;
        if (blockedReloads <= 10) {
          console.warn('[智能求职助手] 阻止页面刷新 #' + blockedReloads);
          return;
        }
        originalReload();
      };

      const originalReplace = location.replace.bind(location);
      location.replace = function(url) {
        if (url && url.includes('zhipin.com')) {
          console.warn('[智能求职助手] 阻止页面跳转');
          return;
        }
        originalReplace(url);
      };
    })();
  `;

  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// 初始化函数
function initContentScript() {
  chrome.runtime.sendMessage({ type: 'LOG', data: 'Content Script 已加载（动态特征匹配模式）' });

  // 判断是否是职位详情页
  const isJobDetailPage = /job_detail|web\/geek\/job/.test(window.location.href);

  if (isJobDetailPage) {
    chrome.runtime.sendMessage({ type: 'LOG', data: '职位详情页模式' });
  } else {
    // 职位列表页 - 监听职位列表
    observeJobList((jobs) => {
      chrome.runtime.sendMessage({
        type: 'LOG',
        data: `检测到职位更新: ${jobs.length} 个职位`
      });
      if (jobs.length > 0) {
        chrome.runtime.sendMessage({
          type: 'LOG',
          data: `职位示例: ${jobs[0].title} | ${jobs[0].salary} | ${jobs[0].company}`
        });
      }
      sendJobsToBackground(jobs);
    });
  }

  // 监听来自 Popup/Background 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_JOBS') {
      const jobs = getAllJobsOnPage();
      sendResponse(jobs);
    }
    else if (message.type === 'TEST_DOM') {
      // DOM诊断测试
      const result = runDomDiagnosis();
      sendResponse(result);
    }
    else if (message.type === 'SEND_GREETING') {
      // 职位详情页发送问候语
      chrome.runtime.sendMessage({ type: 'LOG', data: `收到发送问候语指令: ${message.greeting.substring(0, 30)}...` });
      sendGreeting(message.greeting).then(sendResponse);
      return true;
    }
    else if (message.type === 'TEST_DETAIL_DOM') {
      // 详情页DOM诊断
      const diagnosis = {
        chatButton: findChatButton()?.outerHTML?.substring(0, 100) || null,
        inputField: findInputField()?.outerHTML?.substring(0, 100) || null,
        sendButton: findSendButton()?.outerHTML?.substring(0, 100) || null,
        allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim() || '').slice(0, 10),
        allTextareas: Array.from(document.querySelectorAll('textarea')).map(t => ({
          placeholder: t.placeholder,
          className: t.className,
        })),
      };
      sendResponse(diagnosis);
      return true;
    }
    return true;
  });
}

// ========== 职位详情页功能 ==========

// 查找"立即沟通"按钮
function findChatButton(): HTMLElement | null {
  const selectors = [
    '.start-chat-btn',
    '[class*="start-chat"]',
    '[class*="chat-btn"]',
    '[class*="communicate"]',
    '[class*="goutong"]',
  ];

  for (const selector of selectors) {
    const btn = document.querySelector<HTMLElement>(selector);
    if (btn) return btn;
  }

  const buttons = document.querySelectorAll<HTMLElement>('button, [role="button"], a.btn');
  for (const btn of buttons) {
    const text = btn.textContent?.trim() || '';
    if (text.includes('立即沟通') || text.includes('我要沟通') || text.includes('打招呼')) {
      return btn;
    }
  }

  return null;
}

// 查找输入框
function findInputField(): HTMLTextAreaElement | HTMLInputElement | null {
  const selectors = [
    'textarea[class*="chat"]',
    'textarea[class*="input"]',
    'textarea[class*="message"]',
    'textarea[placeholder*="打招呼"]',
    'textarea[placeholder*="回复"]',
    'textarea[placeholder*="输入"]',
  ];

  for (const selector of selectors) {
    const input = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(selector);
    if (input) return input;
  }

  const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea');
  for (const textarea of textareas) {
    const placeholder = textarea.placeholder || '';
    if (placeholder.includes('打招呼') || placeholder.includes('回复') || placeholder.includes('输入')) {
      return textarea;
    }
  }

  return null;
}

// 查找发送按钮
function findSendButton(): HTMLElement | null {
  const selectors = [
    '[class*="send-btn"]',
    '[class*="send"]',
    'button[class*="submit"]',
  ];

  for (const selector of selectors) {
    const btn = document.querySelector<HTMLElement>(selector);
    if (btn) return btn;
  }

  const buttons = document.querySelectorAll<HTMLElement>('button, [role="button"]');
  for (const btn of buttons) {
    const text = btn.textContent?.trim() || '';
    if (text.includes('发送') || text.includes('提交')) {
      return btn;
    }
  }

  return null;
}

// 等待元素
function waitForElement<T extends HTMLElement>(finder: () => T | null, timeout: number = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      const element = finder();
      if (element) {
        resolve(element);
        return;
      }
      if (Date.now() - startTime > timeout) {
        reject(new Error('等待元素超时'));
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}

// 随机延迟
function randomDelay(min: number, max: number): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

// 发送问候语
async function sendGreeting(greeting: string): Promise<{ success: boolean; message: string }> {
  try {
    const chatButton = await waitForElement(findChatButton, 3000);
    if (!chatButton) {
      return { success: false, message: '未找到沟通按钮' };
    }

    chatButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await randomDelay(300, 800);
    chatButton.click();
    chrome.runtime.sendMessage({ type: 'LOG', data: '已点击沟通按钮' });

    await randomDelay(500, 1500);
    const inputField = await waitForElement(findInputField, 3000);
    if (!inputField) {
      return { success: false, message: '未找到输入框' };
    }

    inputField.focus();
    await randomDelay(100, 300);
    inputField.value = greeting;
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
    inputField.dispatchEvent(new Event('change', { bubbles: true }));
    chrome.runtime.sendMessage({ type: 'LOG', data: `已输入问候语: ${greeting.substring(0, 30)}...` });

    await randomDelay(300, 800);
    const sendButton = await waitForElement(findSendButton, 2000);
    if (!sendButton) {
      return { success: false, message: '未找到发送按钮' };
    }

    sendButton.click();
    chrome.runtime.sendMessage({ type: 'LOG', data: '已点击发送按钮' });
    await randomDelay(500, 1000);

    return { success: true, message: '问候语已发送' };
  } catch (error) {
    chrome.runtime.sendMessage({ type: 'LOG_ERROR', data: `发送问候语失败: ${String(error)}` });
    return { success: false, message: String(error) };
  }
}

// DOM诊断测试函数
function runDomDiagnosis() {
  const diagnosis = {
    pageUrl: window.location.href,
    readyState: document.readyState,
    jobLinksCount: 0,
    jobLinkExamples: [] as Array<{ href: string; text: string; parentClass: string }>,
    salaryElements: [] as Array<{ class: string; text: string; parentClass: string; grandParentClass: string }>,
    possibleContainers: [] as Array<{ class: string; childCount: number; jobLinksCount: number }>,
    allLinksAnalysis: [] as Array<{ href: string; text: string; containsJob: boolean }>,
    possibleJobCards: [] as Array<{
      elementTag: string;
      class: string;
      innerTextPreview: string;
      hasSalary: boolean;
      childCount: number;
      childClasses?: string[];
      salaryElements?: Array<{ class: string; text: string; tag: string }>;
      siblingSalaries?: Array<{ class: string; text: string; tag: string }>;
    }>,
    jobKeywordElements: [] as Array<{ text: string; class: string; tag: string }>,
    salaryRelatedElements: [] as Array<{ class: string; text: string; tag: string; parentClass: string }>,
    jobSalaryDeepAnalysis: [] as Array<{
      class: string;
      innerHTML: string;
      textContent: string;
      innerText: string;
      hasChildren: boolean;
      childrenCount: number;
      display: string;
      visibility: string;
      opacity: string;
      fontSize: string;
      color: string;
      position: string;
      dataset: string;
      title: string;
      ariaLabel: string;
      beforeContent: string;
      beforeDisplay: string;
      afterContent: string;
      afterDisplay: string;
      hasShadowRoot: boolean;
      shadowContent: string;
    }>,
    allSalaryTextsInPage: [] as string[],
  };

  // 测试1：正确的职位链接检测（/job_detail/xxx.html）
  const jobLinks = document.querySelectorAll('a[href*="/job_detail/"]');
  diagnosis.jobLinksCount = jobLinks.length;
  jobLinks.forEach((link, i) => {
    if (i < 5) {
      diagnosis.jobLinkExamples.push({
        href: link.href.substring(0, 80),
        text: (link.textContent?.trim() || '').substring(0, 40),
        parentClass: (link.parentElement?.className?.toString() || '').substring(0, 30),
      });
    }
  });

  // 测试2：深度查找薪资元素 - 检查每个包含薪资格式的元素及其层级
  const allElements = document.querySelectorAll('*');
  const seenSalaryElements = new Set<Element>();

  allElements.forEach((el) => {
    const text = el.textContent?.trim() || '';
    // 匹配薪资格式
    if (text && /^[\d·.]+\s*[-·]\s*[\d·.]+\s*[Kk万]$/i.test(text) && text.length < 15) {
      if (!seenSalaryElements.has(el) && el.children.length <= 1) {
        seenSalaryElements.add(el);
        diagnosis.salaryElements.push({
          class: (el.className?.toString() || 'no-class').substring(0, 30),
          text: text,
          parentClass: (el.parentElement?.className?.toString() || 'no-class').substring(0, 30),
          grandParentClass: (el.parentElement?.parentElement?.className?.toString() || 'no-class').substring(0, 40),
        });
      }
    }
  });

  // 如果上面没找到，再用更宽松的匹配
  if (diagnosis.salaryElements.length === 0) {
    allElements.forEach((el) => {
      const text = el.textContent?.trim() || '';
      if (text && /\d+[-·]\d+[Kk万]/.test(text) && el.children.length <= 3 && text.length < 20) {
        if (!seenSalaryElements.has(el)) {
          seenSalaryElements.add(el);
          diagnosis.salaryElements.push({
            class: (el.className?.toString() || 'no-class').substring(0, 30),
            text: text.substring(0, 15),
            parentClass: (el.parentElement?.className?.toString() || 'no-class').substring(0, 30),
            grandParentClass: (el.parentElement?.parentElement?.className?.toString() || 'no-class').substring(0, 40),
          });
        }
      }
    });
  }

  diagnosis.salaryElements = diagnosis.salaryElements.slice(0, 10);

  // 测试3：分析职位卡片结构（通过 job-card-box）
  const jobCards = document.querySelectorAll('.job-card-box, [class*="job-card"]');
  jobCards.forEach((card) => {
    const cardText = card.textContent || '';
    const cardClass = card.className?.toString() || '';

    // 深度分析卡片内的每个子元素，查找薪资位置
    const childElements = card.querySelectorAll('*');
    const salaryElementsInCard = [];
    const allChildClasses = [];

    childElements.forEach((child) => {
      const childText = child.textContent?.trim() || '';
      const childClass = child.className?.toString() || '';

      // 收集所有子元素的class
      if (childClass && allChildClasses.length < 20) {
        allChildClasses.push(childClass.substring(0, 40));
      }

      // 查找包含薪资格式的子元素（更宽松匹配）
      if (childText && /\d+[-·~]\d+[Kk万]/.test(childText) && childText.length < 20 && child.children.length <= 2) {
        salaryElementsInCard.push({
          class: childClass.substring(0, 30) || 'no-class',
          text: childText.substring(0, 15),
          tag: child.tagName,
        });
      }
    });

    // NEW: 检查兄弟元素中是否有薪资
    const siblingElements = card.parentElement?.children || [];
    const siblingSalaries = [];
    for (const sibling of siblingElements) {
      if (sibling === card) continue;
      const siblingText = sibling.textContent?.trim() || '';
      if (/\d+[-·~]\d+[Kk万]/.test(siblingText) && siblingText.length < 20) {
        siblingSalaries.push({
          class: (sibling.className?.toString() || 'no-class').substring(0, 30),
          text: siblingText.substring(0, 15),
          tag: sibling.tagName,
        });
      }
    }

    if (diagnosis.possibleJobCards.length < 5) {
      diagnosis.possibleJobCards.push({
        elementTag: card.tagName,
        class: cardClass.substring(0, 50),
        innerTextPreview: cardText.substring(0, 100).replace(/\s+/g, ' ').trim(),
        hasSalary: salaryElementsInCard.length > 0,
        childCount: card.children.length,
        // 添加子元素class列表和薪资元素
        childClasses: allChildClasses.slice(0, 15),
        salaryElements: salaryElementsInCard,
        // NEW: 添加兄弟元素薪资信息
        siblingSalaries: siblingSalaries,
      });
    }
  });

  // NEW: 测试3.5：检查 job-info 或 salary 相关的独立元素
  const salaryRelatedElements = document.querySelectorAll('[class*="salary"], [class*="info"], [class*="price"], [class*="money"]');
  diagnosis.salaryRelatedElements = [];
  salaryRelatedElements.forEach((el, i) => {
    if (i < 10) {
      diagnosis.salaryRelatedElements.push({
        class: (el.className?.toString() || '').substring(0, 50),
        text: (el.textContent?.trim() || '').substring(0, 30),
        tag: el.tagName,
        parentClass: (el.parentElement?.className?.toString() || '').substring(0, 30),
      });
    }
  });

  // NEW: 测试3.6：深度分析 job-salary 元素
  const jobSalaryElements = document.querySelectorAll('.job-salary');
  diagnosis.jobSalaryDeepAnalysis = [];
  jobSalaryElements.forEach((el, i) => {
    if (i < 5) {
      const computedStyle = window.getComputedStyle(el);
      // 检查伪元素 ::before 和 ::after
      const beforeStyle = window.getComputedStyle(el, '::before');
      const afterStyle = window.getComputedStyle(el, '::after');

      diagnosis.jobSalaryDeepAnalysis.push({
        class: (el.className?.toString() || '').substring(0, 30),
        innerHTML: (el.innerHTML || '').substring(0, 50),
        textContent: (el.textContent?.trim() || '').substring(0, 30),
        innerText: (el.innerText || '').substring(0, 30),
        hasChildren: el.children.length > 0,
        childrenCount: el.children.length,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        fontSize: computedStyle.fontSize,
        color: computedStyle.color,
        position: computedStyle.position,
        // 检查 data 属性
        dataset: Object.keys(el.dataset || {}).length > 0 ? JSON.stringify(el.dataset).substring(0, 100) : '',
        // 检查 title 属性
        title: el.getAttribute('title') || '',
        // 检查 aria-label
        ariaLabel: el.getAttribute('aria-label') || '',
        // NEW: 检查伪元素
        beforeContent: beforeStyle.content || '',
        beforeDisplay: beforeStyle.display || '',
        afterContent: afterStyle.content || '',
        afterDisplay: afterStyle.display || '',
        // 检查 Shadow DOM
        hasShadowRoot: el.shadowRoot !== null,
        shadowContent: el.shadowRoot ? (el.shadowRoot.textContent?.trim() || '').substring(0, 50) : '',
      });
    }
  });

  // 测试3.7：检查整个页面 innerText 中所有薪资格式文本
  diagnosis.allSalaryTextsInPage = [];
  const fullPageText = document.body.innerText || '';
  const salaryRegexGlobal = /\d+[-·~]\d+[Kk万]/g;
  let salaryMatch;
  while ((salaryMatch = salaryRegexGlobal.exec(fullPageText)) !== null) {
    if (diagnosis.allSalaryTextsInPage.length < 20) {
      diagnosis.allSalaryTextsInPage.push(salaryMatch[0]);
    }
  }

  // 测试4：分析所有链接
  const allLinks = document.querySelectorAll('a');
  const linkHrefs = new Set<string>();
  allLinks.forEach((link) => {
    const href = link.href;
    if (linkHrefs.has(href)) return;
    linkHrefs.add(href);

    const text = link.textContent?.trim() || '';
    const isJobDetail = href.includes('job_detail');
    const hasJobKeyword = /工程师|开发|经理|专员|设计|产品|运营|测试|主管|销售|普工|物流|实习/.test(text);
    const isJobRelated = isJobDetail || hasJobKeyword;

    if (diagnosis.allLinksAnalysis.length < 25) {
      diagnosis.allLinksAnalysis.push({
        href: href.substring(0, 80),
        text: text.substring(0, 30),
        containsJob: isJobRelated,
      });
    }
  });

  // 测试5：检测class中包含"job"或"card"或"salary"的元素
  document.querySelectorAll('[class*="job"], [class*="card"], [class*="salary"], [class*="price"], [class*="money"]').forEach((el) => {
    const text = el.textContent?.trim() || '';
    if (text.length > 10 && text.length < 200) {
      if (diagnosis.jobKeywordElements.length < 15) {
        diagnosis.jobKeywordElements.push({
          text: text.substring(0, 80).replace(/\s+/g, ' ').trim(),
          class: (el.className?.toString() || '').substring(0, 50),
          tag: el.tagName,
        });
      }
    }
  });

  return diagnosis;
}