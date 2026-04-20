import React, { useState, useEffect } from 'react';
import { UserConfig, DEFAULT_CONFIG, EducationLevel } from '../utils/types';
import { getUserConfig, saveUserConfig } from '../utils/storage';

const EDUCATION_OPTIONS: EducationLevel[] = ['不限', '大专', '本科', '硕士', '博士'];

const COMPANY_SIZE_OPTIONS = [
  { label: '不限', min: 0, max: 10000 },
  { label: '0-20人', min: 0, max: 20 },
  { label: '20-99人', min: 20, max: 99 },
  { label: '100-499人', min: 100, max: 499 },
  { label: '500-999人', min: 500, max: 999 },
  { label: '1000人以上', min: 1000, max: 10000 },
];

const SALARY_PRESET_OPTIONS = [
  { label: '不限', min: 0, max: 200 },
  { label: '5-10K', min: 5, max: 10 },
  { label: '10-15K', min: 10, max: 15 },
  { label: '15-20K', min: 15, max: 20 },
  { label: '20-30K', min: 20, max: 30 },
  { label: '30-50K', min: 30, max: 50 },
  { label: '50K以上', min: 50, max: 200 },
];

function FilterPanel() {
  const [config, setConfig] = useState<UserConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [salaryMinStr, setSalaryMinStr] = useState('0');
  const [salaryMaxStr, setSalaryMaxStr] = useState('100');

  useEffect(() => {
    getUserConfig().then((cfg) => {
      setConfig(cfg);
      setSalaryMinStr(String(cfg.salaryMin));
      setSalaryMaxStr(String(cfg.salaryMax));
    });
  }, []);

  const handleSave = async () => {
    const minVal = parseInt(salaryMinStr, 10) || 0;
    const maxVal = parseInt(salaryMaxStr, 10) || 200;
    const newConfig = {
      ...config,
      salaryMin: minVal,
      salaryMax: maxVal,
    };
    setConfig(newConfig);
    await saveUserConfig(newConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateConfig = (key: keyof UserConfig, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSalaryPreset = (preset: typeof SALARY_PRESET_OPTIONS[number]) => {
    setSalaryMinStr(String(preset.min));
    setSalaryMaxStr(String(preset.max));
  };

  // 处理薪资输入，保留用户输入的数字格式
  const handleSalaryInput = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    // 只允许输入数字
    const numStr = value.replace(/[^\d]/g, '');
    setter(numStr);
  };

  return (
    <div className="space-y-4">
      {/* 薪资范围 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">💰 薪资范围</h3>
        {/* 快捷预设 */}
        <div className="flex flex-wrap gap-1 mb-2">
          {SALARY_PRESET_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleSalaryPreset(opt)}
              className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                salaryMinStr === String(opt.min) && salaryMaxStr === String(opt.max)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* 自定义输入 */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={salaryMinStr}
            onChange={(e) => handleSalaryInput(e.target.value, setSalaryMinStr)}
            className="w-20 border rounded px-2 py-1 text-sm text-center"
            placeholder="最低"
          />
          <span className="text-gray-500">-</span>
          <input
            type="text"
            value={salaryMaxStr}
            onChange={(e) => handleSalaryInput(e.target.value, setSalaryMaxStr)}
            className="w-20 border rounded px-2 py-1 text-sm text-center"
            placeholder="最高"
          />
          <span className="text-gray-500 text-sm font-medium">K</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">输入单位为K（千元），如 10 表示 10K = 1万元</p>
      </section>

      {/* 公司规模 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">🏢 公司规模</h3>
        <select
          className="w-full border rounded px-2 py-1 text-sm"
          value={COMPANY_SIZE_OPTIONS.findIndex(
            (opt) => opt.min === config.companySizeMin && opt.max === config.companySizeMax
          )}
          onChange={(e) => {
            const opt = COMPANY_SIZE_OPTIONS[Number(e.target.value)];
            updateConfig('companySizeMin', opt.min);
            updateConfig('companySizeMax', opt.max);
          }}
        >
          {COMPANY_SIZE_OPTIONS.map((opt, idx) => (
            <option key={idx} value={idx}>{opt.label}</option>
          ))}
        </select>
      </section>

      {/* 学历要求 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">🎓 学历要求</h3>
        <div className="flex flex-wrap gap-2">
          {EDUCATION_OPTIONS.map((level) => (
            <label
              key={level}
              className={`px-2 py-1 rounded text-sm cursor-pointer ${
                config.educationLevel.includes(level)
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <input
                type="checkbox"
                checked={config.educationLevel.includes(level)}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateConfig('educationLevel', [...config.educationLevel, level]);
                  } else {
                    updateConfig(
                      'educationLevel',
                      config.educationLevel.filter((l) => l !== level)
                    );
                  }
                }}
                className="hidden"
              />
              {level}
            </label>
          ))}
        </div>
      </section>

      {/* Boss活跃度 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">⚡ Boss活跃时间</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={config.bossActiveHours}
            onChange={(e) => updateConfig('bossActiveHours', Number(e.target.value))}
            className="w-20 border rounded px-2 py-1 text-sm"
          />
          <span className="text-gray-500 text-sm">小时内活跃</span>
        </div>
      </section>

      {/* 关键字筛选 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">📝 工作内容关键字</h3>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500 mb-1">包含关键字（必须包含）</label>
            <textarea
              value={config.keywordsInclude.join('\n')}
              onChange={(e) =>
                updateConfig(
                  'keywordsInclude',
                  e.target.value.split('\n').filter(Boolean)
                )
              }
              className="w-full border rounded px-2 py-1 text-sm h-16 resize-none"
              placeholder="每行一个关键字"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1">排除关键字（包含则过滤）</label>
            <textarea
              value={config.keywordsExclude.join('\n')}
              onChange={(e) =>
                updateConfig(
                  'keywordsExclude',
                  e.target.value.split('\n').filter(Boolean)
                )
              }
              className="w-full border rounded px-2 py-1 text-sm h-16 resize-none"
              placeholder="每行一个关键字"
            />
          </div>
        </div>
      </section>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        className={`w-full py-2 rounded text-white font-medium ${
          saved ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {saved ? '✓ 已保存' : '保存筛选配置'}
      </button>
    </div>
  );
}

export default FilterPanel;