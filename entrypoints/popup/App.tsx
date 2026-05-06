import React, { useState } from 'react';
import SettingsPanel from '../../components/SettingsPanel';
import FilterPanel from '../../components/FilterPanel';
import AIConfigPanel from '../../components/AIConfigPanel';
import DiagnosisPanel from '../../components/DiagnosisPanel';
import JobListPanel from '../../components/JobListPanel';
import ApplyHistoryPanel from '../../components/ApplyHistoryPanel';

type TabType = 'jobs' | 'history' | 'diagnosis' | 'filter' | 'settings' | 'ai';

function Popup() {
  const [activeTab, setActiveTab] = useState<TabType>('jobs');

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'jobs', label: '职位', icon: '📋' },
    { key: 'history', label: '历史', icon: '📝' },
    { key: 'diagnosis', label: '诊断', icon: '🔍' },
    { key: 'filter', label: '筛选', icon: '⚙️' },
    { key: 'settings', label: '设置', icon: '📄' },
    { key: 'ai', label: 'AI', icon: '🤖' },
  ];

  return (
    <div className="bg-gray-50 h-full">
      {/* Header */}
      <header className="bg-blue-600 text-white px-4 py-3">
        <h1 className="text-lg font-semibold">智能求职助手</h1>
        <p className="text-sm text-blue-100">Boss直聘自动化投递</p>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="p-4 overflow-y-auto">
        {activeTab === 'jobs' && <JobListPanel />}
        {activeTab === 'history' && <ApplyHistoryPanel />}
        {activeTab === 'diagnosis' && <DiagnosisPanel />}
        {activeTab === 'filter' && <FilterPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
        {activeTab === 'ai' && <AIConfigPanel />}
      </main>

      {/* Footer */}
      <footer className="border-t px-4 py-2 text-center text-xs text-gray-400">
        v1.0.0 | Boss直聘求职助手
      </footer>
    </div>
  );
}

export default Popup;