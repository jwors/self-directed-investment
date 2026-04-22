import React, { useState, useEffect } from 'react';
import { JobInfo, UserConfig, DEFAULT_CONFIG } from '../utils/types';
import { getUserConfig, saveUserConfig } from '../utils/storage';

interface JobListPanelProps {
  onJobSelect?: (jobs: JobInfo[]) => void;
}

function JobListPanel({ onJobSelect }: JobListPanelProps) {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobInfo[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<UserConfig | null>(null);

  // 加载用户配置
  useEffect(() => {
    getUserConfig().then(setConfig);
  }, []);

  // 应用筛选规则
  const applyFilters = (jobList: JobInfo[], userConfig: UserConfig | null) => {
    if (!userConfig) return jobList;

    return jobList.filter(job => {
      // 薪资筛选
      if (userConfig.salaryMin > 0 && job.salaryMax < userConfig.salaryMin) {
        return false;
      }
      if (userConfig.salaryMax > 0 && job.salaryMin > userConfig.salaryMax) {
        return false;
      }

      // 公司黑名单筛选
      if (userConfig.companyBlacklist.length > 0) {
        const isBlacklisted = userConfig.companyBlacklist.some(
          blacklist => job.company.toLowerCase().includes(blacklist.toLowerCase())
        );
        if (isBlacklisted) return false;
      }

      // 学历筛选
      if (userConfig.educationLevel.length > 0 && !userConfig.educationLevel.includes('不限')) {
        const jobEducation = job.education?.trim() || '';
        // 如果职位学历为空或学历不限，始终通过
        if (!jobEducation || jobEducation.includes('学历不限')) {
          return true;  // 继续检查其他筛选条件
        }
        // 如果职位学历不在用户接受的学历列表中，排除
        const educationMatch = userConfig.educationLevel.some(
          edu => jobEducation.includes(edu)
        );
        if (!educationMatch) return false;
      }

      // Boss活跃时间筛选
      if (userConfig.bossActiveHours > 0) {
        const activeHours = job.bossActiveHours || 9999;
        if (activeHours > userConfig.bossActiveHours) {
          return false;
        }
      }

      // 公司规模筛选
      if (userConfig.companySizeMin > 0 && job.companySizeNum < userConfig.companySizeMin) {
        return false;
      }
      if (userConfig.companySizeMax > 0 && job.companySizeNum > userConfig.companySizeMax) {
        return false;
      }

      // 精准匹配关键词（区分大小写）
      const jobText = `${job.title} ${job.jobDescription}`;

      // 辅助函数：检查关键词是否精准匹配（独立出现）
      const preciseMatch = (text: string, keyword: string): boolean => {
        // 转义正则特殊字符
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 使用正则匹配：前后是单词边界或非字母数字字符
        const regex = new RegExp(`(^|[^a-zA-Z0-9])${escapedKeyword}($|[^a-zA-Z0-9])`, 'u');
        return regex.test(text);
      };

      // 关键词筛选（包含）- 必须包含其中一个关键词
      if (userConfig.keywordsInclude.length > 0) {
        const hasIncludeKeyword = userConfig.keywordsInclude.some(
          keyword => preciseMatch(jobText, keyword)
        );
        if (!hasIncludeKeyword) return false;
      }

      // 关键词筛选（排除）- 包含任一排除关键词则过滤
      if (userConfig.keywordsExclude.length > 0) {
        const hasExcludeKeyword = userConfig.keywordsExclude.some(
          keyword => preciseMatch(jobText, keyword)
        );
        if (hasExcludeKeyword) return false;
      }

      return true;
    });
  };

  // 获取职位
  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    setJobs([]);
    setFilteredJobs([]);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        setError('无法获取当前标签页');
        setLoading(false);
        return;
      }

      if (!tab.url?.includes('zhipin.com')) {
        setError('当前页面不是Boss直聘，请先打开职位列表页面');
        setLoading(false);
        return;
      }

      chrome.tabs.sendMessage(tab.id!, { type: 'GET_JOBS' }, (response) => {
        setLoading(false);
        if (chrome.runtime.lastError) {
          setError('无法连接到页面，请刷新页面后重试');
          return;
        }
        if (!response) {
          setError('未收到职位数据，请刷新页面后重试');
          return;
        }

        const jobList = response as JobInfo[];
        setJobs(jobList);
        setFilteredJobs(applyFilters(jobList, config));
      });
    } catch (e) {
      setLoading(false);
      setError('获取职位失败: ' + String(e));
    }
  };

  // 勾选职位
  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filteredJobs.map(job => job.id)));
    }
  };

  // 打开职位详情
  const openJobDetail = (url: string) => {
    chrome.tabs.create({ url });
  };

  // 重置筛选配置
  const resetFilters = async () => {
    const defaultConfig = { ...DEFAULT_CONFIG };
    await saveUserConfig(defaultConfig);
    setConfig(defaultConfig);
    setFilteredJobs(applyFilters(jobs, defaultConfig));
  };

  return (
    <div className="space-y-3">
      {/* 说明 */}
      <section className="bg-white rounded-lg p-2 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-1 text-sm">📋 获取职位</h3>
        <p className="text-xs text-gray-500">
          请先打开Boss职位列表页面，然后点击获取按钮
        </p>
        {config && (
          <div className="mt-2 text-xs text-gray-400 border-t pt-2">
            <p>当前筛选配置：</p>
            <div className="flex gap-2 mt-1">
              <span className={config.salaryMax > 0 ? 'text-orange-600' : 'text-gray-500'}>
                薪资: {config.salaryMax > 0 ? `${config.salaryMin}-${config.salaryMax}K` : '不限'}
              </span>
              <span className={config.bossActiveHours > 0 ? 'text-orange-600' : 'text-gray-500'}>
                Boss活跃: {config.bossActiveHours > 0 ? `${config.bossActiveHours}小时内` : '不限'}
              </span>
              <span className={config.educationLevel.length < 5 ? 'text-orange-600' : 'text-gray-500'}>
                学历: {config.educationLevel.length < 5 ? config.educationLevel.join('/') : '不限'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 获取按钮 */}
      <button
        onClick={fetchJobs}
        disabled={loading}
        className={`w-full py-2 rounded text-white font-medium text-sm ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? '获取中...' : '获取当前页面职位'}
      </button>

      {/* 错误信息 */}
      {error && (
        <section className="bg-red-50 rounded-lg p-2 border border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </section>
      )}

      {/* 职位统计 */}
      {jobs.length > 0 && (
        <section className="bg-white rounded-lg p-2 shadow-sm">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              共获取 <span className="font-bold text-blue-600">{jobs.length}</span> 个职位
            </span>
            <span className="text-gray-500">
              符合筛选 <span className="font-bold text-green-600">{filteredJobs.length}</span> 个
            </span>
          </div>
          {jobs.length !== filteredJobs.length && (
            <div className="mt-2 flex justify-between items-center">
              <p className="text-xs text-orange-600">
                已过滤 {jobs.length - filteredJobs.length} 个不符合条件的职位
              </p>
              <button
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                重置筛选
              </button>
            </div>
          )}
        </section>
      )}

      {/* 无职位提示 */}
      {jobs.length > 0 && filteredJobs.length === 0 && (
        <section className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
          <div className="flex justify-between items-center">
            <p className="text-xs text-yellow-700">
              没有符合筛选条件的职位
            </p>
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              重置筛选
            </button>
          </div>
        </section>
      )}

      {/* 职位列表 */}
      {filteredJobs.length > 0 && (
        <div className="space-y-2">
          {/* 操作栏 */}
          <div className="flex justify-between items-center bg-white rounded-lg p-2 shadow-sm">
            <button
              onClick={toggleSelectAll}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {selectedJobs.size === filteredJobs.length ? '取消全选' : '全选'}
            </button>
            <span className="text-xs text-gray-500">
              已选择 {selectedJobs.size} 个
            </span>
          </div>

          {/* 职位卡片列表 */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className={`bg-white rounded-lg p-2 shadow-sm cursor-pointer transition-colors ${
                  selectedJobs.has(job.id) ? 'border-2 border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => toggleJobSelection(job.id)}
              >
                {/* 职位名和薪资 */}
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-gray-800 text-sm truncate flex-1">
                    {job.title}
                  </p>
                  <p className="text-red-600 font-bold text-sm ml-2">
                    {job.salary}
                  </p>
                </div>

                {/* 公司和地区 */}
                <div className="text-xs text-gray-600 mb-1">
                  <span className="font-medium">{job.company}</span>
                  {job.location && <span className="ml-2 text-gray-400">{job.location}</span>}
                </div>

                {/* 标签 */}
                <div className="flex gap-1 text-xs text-gray-500">
                  {job.experience && (
                    <span className="bg-gray-100 px-1 rounded">{job.experience}</span>
                  )}
                  {job.education && (
                    <span className="bg-gray-100 px-1 rounded">{job.education}</span>
                  )}
                </div>

                {/* Boss信息 */}
                {job.bossName && (
                  <div className="text-xs text-gray-500 mt-1">
                    <span>{job.bossName}</span>
                    {job.bossTitle && <span className="ml-1 text-gray-400">| {job.bossTitle}</span>}
                    {job.bossActiveTime && (
                      <span className="ml-2 text-green-600">{job.bossActiveTime}</span>
                    )}
                  </div>
                )}

                {/* 打开详情按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openJobDetail(job.url);
                  }}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  打开职位详情
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default JobListPanel;