import React, { useState, useEffect } from 'react';
import { AIConfig, AIProvider, AI_PROVIDER_CONFIG, DEFAULT_AI_CONFIG } from '../utils/types';
import { getAIConfig, saveAIConfig } from '../utils/storage';

function AIConfigPanel() {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
    setTestResult(null); // 清除之前的测试结果
  };

  // 测试AI连接
  const testConnection = async () => {
    if (!config.apiKey) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: '你好，请回复"测试成功"' }],
          max_tokens: 20,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `HTTP错误: ${response.status}`;
        setTestResult({ success: false, message: errorMsg });
        return;
      }

      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        setTestResult({ success: true, message: '连接成功！AI已响应。' });
      } else {
        setTestResult({ success: false, message: '响应格式异常' });
      }
    } catch (e) {
      setTestResult({ success: false, message: `连接失败: ${String(e)}` });
    } finally {
      setTesting(false);
    }
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
          onClick={testConnection}
          disabled={!config.apiKey || testing}
          className={`w-full py-2 rounded text-sm font-medium ${
            testing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : config.apiKey
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          {testing ? '测试中...' : '测试连接'}
        </button>

        {/* 测试结果 */}
        {testResult && (
          <div className={`mt-2 p-2 rounded text-xs ${
            testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {testResult.success ? '✓ ' : '✗ '}{testResult.message}
          </div>
        )}
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