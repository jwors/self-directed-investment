import React, { useState, useEffect } from 'react';
import { getApplyHistory, clearApplyHistory, ApplyHistoryItem } from '../utils/storage';

function ApplyHistoryPanel() {
  const [history, setHistory] = useState<ApplyHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getApplyHistory();
    setHistory(data.reverse()); // 最新的显示在最前面
    setLoading(false);
  };

  const handleClear = async () => {
    await clearApplyHistory();
    setHistory([]);
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return '刚刚';
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  // 统计数据
  const stats = {
    total: history.length,
    today: history.filter(item => {
      const diffMs = Date.now() - item.appliedAt;
      return diffMs < 24 * 60 * 60 * 1000;
    }).length,
    thisWeek: history.filter(item => {
      const diffMs = Date.now() - item.appliedAt;
      return diffMs < 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <section className="bg-white rounded-lg p-3 shadow-sm">
          <p className="text-xs text-gray-500">加载中...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 统计 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">📊 投递统计</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-blue-600">{stats.total}</p>
            <p className="text-xs text-gray-500">总计</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-green-600">{stats.today}</p>
            <p className="text-xs text-gray-500">今日</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-orange-600">{stats.thisWeek}</p>
            <p className="text-xs text-gray-500">本周</p>
          </div>
        </div>
      </section>

      {/* 清除按钮 */}
      {history.length > 0 && (
        <button
          onClick={handleClear}
          className="w-full py-2 rounded text-xs text-red-600 bg-red-50 hover:bg-red-100"
        >
          清除历史记录
        </button>
      )}

      {/* 空状态 */}
      {history.length === 0 && (
        <section className="bg-white rounded-lg p-3 shadow-sm text-center">
          <p className="text-xs text-gray-500">暂无投递记录</p>
          <p className="text-xs text-gray-400 mt-1">开始批量打招呼后会自动记录</p>
        </section>
      )}

      {/* 历史列表 */}
      {history.length > 0 && (
        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {history.map((item, index) => (
            <div
              key={`${item.jobId}-${index}`}
              className="bg-white rounded-lg p-2 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm truncate">{item.jobTitle}</p>
                  <p className="text-xs text-gray-600">{item.company}</p>
                </div>
                <span className="text-xs text-gray-400 ml-2">{formatTime(item.appliedAt)}</span>
              </div>
              {/* 问候语预览 */}
              {item.greeting && (
                <div className="mt-1 text-xs text-gray-500 truncate">
                  💬 {item.greeting.substring(0, 50)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 刷新按钮 */}
      <button
        onClick={loadHistory}
        className="w-full py-2 rounded text-xs text-blue-600 bg-blue-50 hover:bg-blue-100"
      >
        刷新记录
      </button>
    </div>
  );
}

export default ApplyHistoryPanel;