import { defineConfig } from 'wxt';

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '智能求职助手',
    description: '自动化求职投递助手，支持Boss直聘智能筛选和投递',
    version: '1.0.0',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['https://www.zhipin.com/*', 'https://zhipin.com/*'],
  },
});