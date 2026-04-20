import React, { useState, useEffect } from 'react';
import { UserConfig, DEFAULT_CONFIG } from '../utils/types';
import { getUserConfig, saveUserConfig, getResume, saveResume } from '../utils/storage';

function SettingsPanel() {
  const [config, setConfig] = useState<UserConfig>(DEFAULT_CONFIG);
  const [resume, setResume] = useState('');
  const [blacklistInput, setBlacklistInput] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getUserConfig().then((c) => {
      setConfig(c);
      setBlacklistInput(c.companyBlacklist.join('\n'));
    });
    getResume().then(setResume);
  }, []);

  const handleSave = async () => {
    const newConfig = {
      ...config,
      companyBlacklist: blacklistInput.split('\n').filter(Boolean),
    };
    await saveUserConfig(newConfig);
    await saveResume(resume);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateConfig = (key: keyof UserConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* 简历内容 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">📄 我的简历</h3>
        <textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm h-32 resize-none"
          placeholder="粘贴你的简历内容，用于生成个性化问候语..."
        />
        <p className="text-xs text-gray-400 mt-1">简历内容用于AI生成针对性的打招呼内容</p>
      </section>

      {/* 公司黑名单 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">🚫 公司黑名单</h3>
        <textarea
          value={blacklistInput}
          onChange={(e) => setBlacklistInput(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm h-24 resize-none"
          placeholder="每行一个公司名称，这些公司的职位将被过滤..."
        />
        <p className="text-xs text-gray-400 mt-1">黑名单中的公司职位不会投递</p>
      </section>

      {/* 自动投递设置 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">🤖 自动投递</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.autoApplyEnabled}
              onChange={(e) => updateConfig('autoApplyEnabled', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">启用自动投递</span>
          </label>
          {config.autoApplyEnabled && (
            <div className="flex items-center gap-2 ml-6">
              <span className="text-sm text-gray-500">投递间隔:</span>
              <input
                type="number"
                value={config.autoApplyInterval}
                onChange={(e) => updateConfig('autoApplyInterval', Number(e.target.value))}
                className="w-16 border rounded px-2 py-1 text-sm"
                min={3}
                max={60}
              />
              <span className="text-sm text-gray-500">秒</span>
            </div>
          )}
          <p className="text-xs text-gray-400">建议间隔 5-10 秒，避免被检测</p>
        </div>
      </section>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        className={`w-full py-2 rounded text-white font-medium ${
          saved ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {saved ? '✓ 已保存' : '保存设置'}
      </button>
    </div>
  );
}

export default SettingsPanel;