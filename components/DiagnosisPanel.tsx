import React, { useState } from 'react';

interface DiagnosisResult {
  pageUrl: string;
  readyState: string;
  jobLinksCount: number;
  jobLinkExamples: Array<{
    href: string;
    text: string;
    parentClass: string;
  }>;
  salaryElements: Array<{
    class: string;
    text: string;
    parentClass: string;
    grandParentClass: string;
  }>;
  possibleContainers: Array<{
    class: string;
    childCount: number;
    jobLinksCount: number;
  }>;
  allLinksAnalysis: Array<{
    href: string;
    text: string;
    containsJob: boolean;
  }>;
  possibleJobCards: Array<{
    elementTag: string;
    class: string;
    innerTextPreview: string;
    hasSalary: boolean;
    childCount: number;
  }>;
  jobKeywordElements: Array<{
    text: string;
    class: string;
    tag: string;
  }>;
  error?: string;
}

function DiagnosisPanel() {
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runDiagnosis = async () => {
    setLoading(true);
    setError('');
    setResult(null);

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

      chrome.tabs.sendMessage(tab.id!, { type: 'TEST_DOM' }, (response) => {
        setLoading(false);
        if (chrome.runtime.lastError) {
          setError('无法连接到页面，请刷新页面后重试');
          return;
        }
        if (!response) {
          setError('未收到诊断结果，请刷新页面后重试');
          return;
        }
        setResult(response);
      });
    } catch (e) {
      setLoading(false);
      setError('诊断失败: ' + String(e));
    }
  };

  // 复制诊断结果到剪贴板
  const copyResult = () => {
    if (result) {
      const text = JSON.stringify(result, null, 2);
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="space-y-3">
      {/* 说明 */}
      <section className="bg-white rounded-lg p-2 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-1 text-sm">🔍 页面诊断</h3>
        <p className="text-xs text-gray-500">
          请先打开Boss职位列表页面，然后点击诊断按钮
        </p>
      </section>

      {/* 诊断按钮 */}
      <button
        onClick={runDiagnosis}
        disabled={loading}
        className={`w-full py-2 rounded text-white font-medium text-sm ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? '诊断中...' : '诊断当前页面'}
      </button>

      {/* 错误信息 */}
      {error && (
        <section className="bg-red-50 rounded-lg p-2 border border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </section>
      )}

      {/* 诊断结果 */}
      {result && (
        <div className="space-y-2">
          {/* 基本信息 */}
          <section className="bg-white rounded-lg p-2 shadow-sm">
            <div className="text-xs space-y-1">
              <p className="text-gray-500 truncate">URL: {result.pageUrl}</p>
              <p className="text-gray-500">状态: {result.readyState}</p>
              <p className="text-gray-500">
                职位链接数量:
                <span className={`font-bold ml-1 ${result.jobLinksCount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {result.jobLinksCount}
                </span>
              </p>
            </div>
          </section>

          {/* 职位链接示例 */}
          {result.jobLinkExamples.length > 0 && (
            <section className="bg-white rounded-lg p-2 shadow-sm">
              <h3 className="font-medium text-green-700 mb-1 text-xs">✅ 职位链接 ({result.jobLinksCount}个)</h3>
              <div className="space-y-1">
                {result.jobLinkExamples.map((link, i) => (
                  <div key={i} className="bg-green-50 p-2 rounded text-xs">
                    <p className="text-gray-700 font-medium truncate">{link.text || '(空文本)'}</p>
                    <p className="text-blue-600 truncate text-[10px]">{link.href}</p>
                    <p className="text-gray-500 text-[10px]">父级class: {link.parentClass || '(无)'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 薪资元素 */}
          {result.salaryElements.length > 0 && (
            <section className="bg-white rounded-lg p-2 shadow-sm">
              <h3 className="font-medium text-orange-700 mb-1 text-xs">💰 薪资元素 ({result.salaryElements.length}个)</h3>
              <div className="space-y-1">
                {result.salaryElements.map((el, i) => (
                  <div key={i} className="bg-orange-50 p-2 rounded text-xs">
                    <p className="text-orange-700 font-bold">{el.text}</p>
                    <p className="text-gray-600 text-[10px]">class: {el.class}</p>
                    <p className="text-gray-500 text-[10px]">父级: {el.parentClass}</p>
                    <p className="text-gray-400 text-[10px]">祖父级: {el.grandParentClass}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 可能的职位卡片 */}
          {result.possibleJobCards.length > 0 && (
            <section className="bg-white rounded-lg p-2 shadow-sm">
              <h3 className="font-medium text-green-700 mb-1 text-xs">✅ 发现职位卡片 ({result.possibleJobCards.length})</h3>
              <div className="space-y-1">
                {result.possibleJobCards.map((card, i) => (
                  <div key={i} className="bg-green-50 p-2 rounded text-xs">
                    <p className="text-gray-600 font-medium">{card.elementTag} | {card.class}</p>
                    <p className="text-gray-700 truncate">{card.innerTextPreview}</p>
                    <p className="text-gray-500">子元素: {card.childCount} | 薪资: {card.hasSalary ? '✓' : '✗'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 职位关键词元素 */}
          {result.jobKeywordElements.length > 0 && (
            <section className="bg-white rounded-lg p-2 shadow-sm">
              <h3 className="font-medium text-gray-800 mb-1 text-xs">📦 job/card/item 元素 ({result.jobKeywordElements.length})</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.jobKeywordElements.map((el, i) => (
                  <div key={i} className="bg-gray-50 p-1 rounded text-xs">
                    <p className="text-gray-600">{el.tag} | {el.class}</p>
                    <p className="text-gray-700 truncate">{el.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 所有链接分析 */}
          <section className="bg-white rounded-lg p-2 shadow-sm">
            <h3 className="font-medium text-gray-800 mb-1 text-xs">🔗 链接分析 ({result.allLinksAnalysis.length})</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {result.allLinksAnalysis.filter(link => link.containsJob).map((link, i) => (
                <div key={i} className="bg-blue-50 p-1 rounded text-xs">
                  <p className="text-blue-700 font-medium truncate">{link.text}</p>
                  <p className="text-gray-500 truncate">{link.href}</p>
                </div>
              ))}
              {result.allLinksAnalysis.filter(link => link.containsJob).length === 0 && (
                <p className="text-xs text-gray-400">没有检测到职位相关链接</p>
              )}
            </div>
          </section>

          {/* 复制按钮 */}
          <button
            onClick={copyResult}
            className="w-full py-1 rounded text-xs text-gray-600 bg-gray-100 hover:bg-gray-200"
          >
            复制完整诊断结果
          </button>

          {/* 结果提示 */}
          {result.jobLinksCount === 0 && (
            <section className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
              <p className="text-xs text-yellow-700">
                未检测到职位链接，请检查是否在职位列表页面
              </p>
            </section>
          )}

          {result.jobLinksCount > 0 && (
            <section className="bg-blue-50 rounded-lg p-2 border border-blue-200">
              <p className="text-xs text-blue-700">
                已检测到职位链接！请复制诊断结果继续调试
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default DiagnosisPanel;