import React, { useState, useEffect } from 'react';
import { AIConfig, AIProvider, AI_PROVIDER_CONFIG, DEFAULT_AI_CONFIG } from '../utils/types';
import { getAIConfig, saveAIConfig } from '../utils/storage';

function AIConfigPanel() {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAIConfig().then(setConfig);
  }, []);

  const handleSave = async () => {
    await saveAIConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleProviderChange = (provider: AIProvider) => {
    const providerConfig = AI_PROVIDER_CONFIG[provider];
    setConfig({
      provider,
      apiKey: config.apiKey,
      baseUrl: providerConfig.baseUrl,
      model: providerConfig.models[0],
    });
  };

  const currentProvider = AI_PROVIDER_CONFIG[config.provider];

  return (
    <div className="space-y-4">
      {/* AI提供商选择 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">🤖 选择AI模型</h3>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(AI_PROVIDER_CONFIG) as AIProvider[]).map((provider) => {
            const info = AI_PROVIDER_CONFIG[provider];
            return (
              <button
                key={provider}
                onClick={() => handleProviderChange(provider)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  config.provider === provider
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {info.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* API Key */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">🔑 API Key</h3>
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
          className="w-full border rounded px-2 py-1 text-sm"
          placeholder="输入你的 API Key..."
        />
        <p className="text-xs text-gray-400 mt-1">
          请前往 {currentProvider.name} 官网获取 API Key
        </p>
      </section>

      {/* 模型选择 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">📊 选择模型版本</h3>
        <select
          value={config.model}
          onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          {currentProvider.models.map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          不同模型有不同的价格和性能
        </p>
      </section>

      {/* 自定义 Base URL */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-2">🌐 自定义 API 地址</h3>
        <input
          type="text"
          value={config.baseUrl}
          onChange={(e) => setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
          className="w-full border rounded px-2 py-1 text-sm"
          placeholder="自定义 API endpoint..."
        />
        <p className="text-xs text-gray-400 mt-1">
          可使用代理或自定义端点
        </p>
      </section>

      {/* 测试连接 */}
      <section className="bg-white rounded-lg p-3 shadow-sm">
        <button
          disabled={!config.apiKey}
          className={`w-full py-2 rounded text-sm font-medium ${
            config.apiKey
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          测试连接
        </button>
      </section>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        disabled={!config.apiKey}
        className={`w-full py-2 rounded text-white font-medium ${
          saved
            ? 'bg-green-500'
            : config.apiKey
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {saved ? '✓ 已保存' : '保存AI配置'}
      </button>
    </div>
  );
}

export default AIConfigPanel;