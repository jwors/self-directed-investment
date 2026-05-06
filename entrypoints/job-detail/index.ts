import { JobInfo } from '../../utils/types';

// 职位详情页 Content Script - 处理自动打招呼

// 查找"立即沟通"按钮 - 使用动态特征匹配
function findChatButton(): HTMLElement | null {
  // 多种可能的选择器
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

  // 备选：遍历所有按钮查找包含特定文本的
  const buttons = document.querySelectorAll<HTMLElement>('button, [role="button"], a.btn');
  for (const btn of buttons) {
    const text = btn.textContent?.trim() || '';
    if (text.includes('立即沟通') || text.includes('我要沟通') || text.includes('打招呼')) {
      return btn;
    }
  }

  // 查找包含"沟通"的任何可点击元素
  const clickables = document.querySelectorAll<HTMLElement>('[onclick], [class*="click"]');
  for (const el of clickables) {
    if (el.textContent?.includes('沟通')) {
      return el;
    }
  }

  return null;
}

// 查找输入框 - 点击沟通按钮后弹出的输入区域
function findInputField(): HTMLTextAreaElement | HTMLInputElement | null {
  // 多种可能的选择器
  const selectors = [
    'textarea[class*="chat"]',
    'textarea[class*="input"]',
    'textarea[class*="message"]',
    'textarea[placeholder*="打招呼"]',
    'textarea[placeholder*="回复"]',
    'textarea[placeholder*="输入"]',
    'input[class*="chat"]',
    '.chat-input textarea',
    '.message-input textarea',
  ];

  for (const selector of selectors) {
    const input = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(selector);
    if (input) return input;
  }

  // 备选：查找所有 textarea
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
    '.chat-send',
    '.message-send',
  ];

  for (const selector of selectors) {
    const btn = document.querySelector<HTMLElement>(selector);
    if (btn) return btn;
  }

  // 备选：查找包含"发送"文本的按钮
  const buttons = document.querySelectorAll<HTMLElement>('button, [role="button"]');
  for (const btn of buttons) {
    const text = btn.textContent?.trim() || '';
    if (text.includes('发送') || text.includes('提交') || text.includes('回复')) {
      return btn;
    }
  }

  return null;
}

// 等待元素出现（最多等待5秒）
function waitForElement<T extends HTMLElement>(
  finder: () => T | null,
  timeout: number = 5000
): Promise<T> {
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

// 模拟人类操作 - 添加随机延迟
function randomDelay(min: number, max: number): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

// 发送问候语
async function sendGreeting(greeting: string): Promise<{ success: boolean; message: string }> {
  try {
    // 步骤1: 查找并点击"立即沟通"按钮
    const chatButton = await waitForElement(findChatButton, 3000);
    if (!chatButton) {
      return { success: false, message: '未找到沟通按钮' };
    }

    // 模拟人类行为：先滚动到按钮位置
    chatButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await randomDelay(300, 800);

    // 点击按钮
    chatButton.click();
    chrome.runtime.sendMessage({ type: 'LOG', data: '已点击沟通按钮' });

    // 步骤2: 等待输入框出现
    await randomDelay(500, 1500);
    const inputField = await waitForElement(findInputField, 3000);
    if (!inputField) {
      return { success: false, message: '未找到输入框' };
    }

    // 步骤3: 输入问候语
    inputField.focus();
    await randomDelay(100, 300);

    // 设置值
    if (inputField instanceof HTMLTextAreaElement) {
      inputField.value = greeting;
    } else {
      inputField.value = greeting;
    }

    // 触发输入事件（确保页面识别到输入）
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
    inputField.dispatchEvent(new Event('change', { bubbles: true }));
    chrome.runtime.sendMessage({ type: 'LOG', data: `已输入问候语: ${greeting.substring(0, 30)}...` });

    // 步骤4: 查找并点击发送按钮
    await randomDelay(300, 800);
    const sendButton = await waitForElement(findSendButton, 2000);
    if (!sendButton) {
      return { success: false, message: '未找到发送按钮' };
    }

    // 点击发送
    sendButton.click();
    chrome.runtime.sendMessage({ type: 'LOG', data: '已点击发送按钮' });

    // 等待发送完成
    await randomDelay(500, 1000);

    return { success: true, message: '问候语已发送' };
  } catch (error) {
    chrome.runtime.sendMessage({ type: 'LOG_ERROR', data: `发送问候语失败: ${String(error)}` });
    return { success: false, message: String(error) };
  }
}

// Content Script 入口
export default defineContentScript({
  matches: ['https://www.zhipin.com/job_detail/*', 'https://zhipin.com/job_detail/*'],
  runAt: 'document_idle',
  main() {
    chrome.runtime.sendMessage({ type: 'LOG', data: '职位详情页 Content Script 已加载' });

    // 监听来自 Background 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SEND_GREETING') {
        chrome.runtime.sendMessage({ type: 'LOG', data: `收到发送问候语指令: ${message.greeting.substring(0, 30)}...` });
        sendGreeting(message.greeting).then(sendResponse);
        return true; // 保持消息通道开放
      }

      if (message.type === 'TEST_DETAIL_DOM') {
        // 诊断详情页 DOM
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

      return false;
    });
  },
});