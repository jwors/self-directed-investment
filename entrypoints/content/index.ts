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

// 通过特征查找薪资元素
function findSalaryElement(container: Element): { element: Element | null; text: string } {
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
    // 匹配职位链接格式
    const jobIdMatch = href.match(/\/job\/(\w+)/);
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

// 查找标签类信息（学历、经验等）
function findTagElements(container: Element): { education: string; experience: string; location: string } {
  const result = { education: '', experience: '', location: '' };
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

// 查找Boss活跃时间元素
function findBossActiveElement(container: Element): { bossName: string; bossTitle: string; activeTime: string } {
  const result = { bossName: '', bossTitle: '', activeTime: '' };
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

// 查找职位名称
function findJobTitle(container: Element, jobLink: Element | null): string {
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
      const jobLinks = el.querySelectorAll('a[href*="/job/"]');
      if (jobLinks.length > 0) {
        return el;
      }
    }
  }

  // 最后尝试：找包含多个职位链接的父容器
  const allJobLinks = document.querySelectorAll('a[href*="/job/"]');
  if (allJobLinks.length > 0) {
    // 找到第一个职位链接的最近公共父容器
    const firstLink = allJobLinks[0];
    let parent = firstLink.parentElement;
    while (parent) {
      const linksInParent = parent.querySelectorAll('a[href*="/job/"]');
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
  const jobLinks = document.querySelectorAll('a[href*="/job/"]');
  const processedContainers = new Set<Element>();

  jobLinks.forEach((link) => {
    // 找到职位卡片容器（通常是链接的祖父级元素）
    let container = link.parentElement;
    let depth = 0;
    while (container && depth < 5) {
      // 检查是否是一个有效的职位卡片
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
    if (el && el.querySelectorAll('a[href*="/job/"]').length > 0) {
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

  // 监听来自 Popup 的消息
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
    return true;
  });
}

// DOM诊断测试函数
function runDomDiagnosis() {
  const diagnosis = {
    jobLinksCount: 0,
    jobLinkExamples: [] as Array<{ href: string; text: string; parentClass: string }>,
    salaryElements: [] as Array<{ class: string; text: string; parentClass: string }>,
    possibleContainers: [] as Array<{ class: string; childCount: number; jobLinksCount: number }>,
    pageUrl: window.location.href,
    readyState: document.readyState,
    // 新增：所有链接分析
    allLinksAnalysis: [] as Array<{ href: string; text: string; containsJob: boolean }>,
    // 新增：检测职位卡片可能的结构
    possibleJobCards: [] as Array<{
      elementTag: string;
      class: string;
      innerTextPreview: string;
      hasSalary: boolean;
      childCount: number;
    }>,
    // 新增：检测包含职位关键词的元素
    jobKeywordElements: [] as Array<{ text: string; class: string; tag: string }>,
  };

  // 测试1：分析所有链接，找出可能是职位的
  const allLinks = document.querySelectorAll('a');
  const linkHrefs = new Set<string>();
  allLinks.forEach((link) => {
    const href = link.href;
    // 避免重复
    if (linkHrefs.has(href)) return;
    linkHrefs.add(href);

    // 检查是否包含职位相关关键词
    const text = link.textContent?.trim() || '';
    const isJobRelated = href.includes('job') ||
                         text.includes('工程师') ||
                         text.includes('开发') ||
                         text.includes('经理') ||
                         text.includes('专员') ||
                         text.includes('设计') ||
                         text.includes('产品') ||
                         text.includes('运营') ||
                         text.includes('测试') ||
                         text.includes('架构') ||
                         text.includes('数据') ||
                         text.includes('算法');

    if (diagnosis.allLinksAnalysis.length < 20) {
      diagnosis.allLinksAnalysis.push({
        href: href.substring(0, 100),
        text: text.substring(0, 30),
        containsJob: isJobRelated,
      });
    }
  });

  // 测试2：查找包含薪资格式 AND 职位关键词的元素组合（真正的职位卡片）
  const elementsWithSalary = document.querySelectorAll('*');
  const salaryParentElements = new Set<Element>();

  elementsWithSalary.forEach((el) => {
    const text = el.textContent?.trim();
    if (text && /\d+[-·]\d+K/.test(text) && el.children.length <= 3) {
      // 找到薪资元素的父级（可能是职位卡片）
      let parent = el.parentElement;
      for (let i = 0; i < 5 && parent; i++) {
        const parentText = parent.textContent || '';
        // 父级包含职位关键词+薪资，很可能是职位卡片
        if (parentText.length > 20 && parentText.length < 200 &&
            /工程师|开发|经理|专员|设计|产品|运营|测试/.test(parentText)) {
          salaryParentElements.add(parent);
        }
        parent = parent.parentElement;
      }
    }
  });

  salaryParentElements.forEach((el) => {
    const classStr = el.className?.toString() || '';
    diagnosis.possibleJobCards.push({
      elementTag: el.tagName,
      class: classStr.substring(0, 50),
      innerTextPreview: (el.textContent || '').substring(0, 100).replace(/\n+/g, ' | '),
      hasSalary: /\d+[-·]\d+K/.test(el.textContent || ''),
      childCount: el.children.length,
    });
  });

  // 测试3：检测class中包含"job"或"card"的元素
  document.querySelectorAll('[class*="job"], [class*="card"], [class*="item"]').forEach((el) => {
    const text = el.textContent?.trim() || '';
    if (text.length > 20 && text.length < 500 && /\d+K/.test(text)) {
      diagnosis.jobKeywordElements.push({
        text: text.substring(0, 80).replace(/\n+/g, ' | '),
        class: (el.className?.toString() || '').substring(0, 50),
        tag: el.tagName,
      });
    }
  });

  // 限制数量
  diagnosis.possibleJobCards = diagnosis.possibleJobCards.slice(0, 5);
  diagnosis.jobKeywordElements = diagnosis.jobKeywordElements.slice(0, 10);

  return diagnosis;
}