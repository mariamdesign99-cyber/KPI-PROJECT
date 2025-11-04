import React, { useState } from 'react';
import type { Kpi, ChatMessage } from '../App';
import type { AnalysisData } from './KpiCard';
import { generatePdf } from '../services/reportService';
import { DownloadIcon, TrendingUpIcon, TrendingDownIcon, SparklesIcon, LightbulbIcon, MessageCircleIcon } from './icons';
import { Loader } from './Loader';

interface ReportGeneratorProps {
  kpi: Kpi;
  analysisData: AnalysisData;
  chatHistory?: ChatMessage[];
}

const Chart: React.FC<{ data: number[], trend: number[], forecast: number[], isForPdf?: boolean }> = ({ data, trend, forecast, isForPdf = false }) => {
    const allValues = [...data, ...forecast];
    const maxVal = Math.max(...allValues);
    const minVal = Math.min(...allValues);
    const range = maxVal > minVal ? maxVal - minVal : 1;

    const scaleY = (val: number) => 40 - ((val - minVal) / range) * 35;
    const totalPoints = data.length + forecast.length;

    const dataPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${(i / (totalPoints - 1)) * 100},${scaleY(d)}`).join(' ');
    const trendPath = trend.map((d, i) => `${i === 0 ? 'M' : 'L'} ${(i / (data.length - 1)) * (data.length / totalPoints * 100)},${scaleY(d)}`).join(' ');
    const forecastPath = forecast.map((d, i) => `${i === 0 ? 'M' : 'L'} ${((i + data.length - 1) / (totalPoints - 1)) * 100},${scaleY(d)}`).join(' ');
    
    // For the PDF, use darker, more solid colors for better print quality
    const dataStroke = isForPdf ? "#4A5568" : "rgba(59, 130, 246, 0.8)";
    const trendStroke = isForPdf ? "#D97706" : "rgba(234, 179, 8, 0.7)";
    const forecastStroke = isForPdf ? "#0D9488" : "rgba(45, 212, 191, 0.8)";

    return (
        <svg className="w-full h-full p-2" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d={dataPath} fill="none" stroke={dataStroke} strokeWidth="1"/>
            <path d={trendPath} fill="none" stroke={trendStroke} strokeWidth="0.7" strokeDasharray="2,2"/>
            <path d={`M ${((data.length -1) / (totalPoints-1)) * 100},${scaleY(data[data.length-1])} ${forecastPath.substring(1)}`} fill="none" stroke={forecastStroke} strokeWidth="1" strokeDasharray="3,3"/>
        </svg>
    );
};

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ kpi, analysisData, chatHistory = [] }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const reportId = `report-content-${kpi.id}`;
  const isPositive = kpi.change >= 0;

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generatePdf(reportId, `report-${kpi.id}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Не удалось создать PDF-отчет.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Hidden element for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', width: '210mm', minHeight: '297mm', fontFamily: 'Inter, sans-serif' }} className="p-8 bg-white text-gray-800">
        <div id={reportId} className="w-full h-full flex flex-col">
            <header className="pb-4 border-b border-gray-300">
                <h1 className="text-3xl font-bold text-gray-900">Аналитический Отчет по KPI</h1>
                <p className="text-md text-gray-600">Дата генерации: {new Date().toLocaleDateString('ru-RU')}</p>
            </header>
            
            <main className="flex-grow pt-6">
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">{kpi.title}</h2>
                    <div className="flex items-baseline gap-4">
                        <p className="text-5xl font-bold text-cyan-700">{kpi.value}</p>
                        <div className={`flex items-center gap-1 font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                             {isPositive ? <TrendingUpIcon className="w-5 h-5"/> : <TrendingDownIcon className="w-5 h-5"/>}
                             <span>{isPositive ? '+' : ''}{kpi.change}% за {kpi.changeType}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-6 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold p-3 border-b border-gray-200">График тренда и прогноз</h3>
                    <div className="w-full h-64">
                       <Chart 
                           data={analysisData.analysisResult.data} 
                           trend={analysisData.analysisResult.trend.line} 
                           forecast={analysisData.analysisResult.forecast.values}
                           isForPdf={true}
                        />
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                           <SparklesIcon className="w-5 h-5 text-cyan-700" /> Общая оценка
                        </h3>
                        <p className="text-gray-700">{analysisData.geminiText.summary}</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                           <LightbulbIcon className="w-5 h-5 text-cyan-700" /> Рекомендации
                        </h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {analysisData.geminiText.recommendations.split('\n').map((rec, i) => {
                                const cleanRec = rec.trim().replace(/^- \*\*(.*?)\*\*:/, '$1:').replace(/^- /, '');
                                return cleanRec && <li key={i}>{cleanRec}</li>;
                            })}
                        </ul>
                    </div>
                </div>

                {chatHistory.length > 0 && (
                     <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 pt-4 border-t border-gray-300">
                           <MessageCircleIcon className="w-5 h-5 text-cyan-700" /> Диалог с ассистентом
                        </h3>
                        <div className="space-y-3">
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-50 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                    <strong className="font-semibold capitalize">{msg.role === 'user' ? 'Вы' : 'Ассистент'}:</strong>
                                    <p className="m-0">{msg.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
             <footer className="text-center pt-4 mt-auto text-xs text-gray-500 border-t border-gray-300">
                Отчет сгенерирован с использованием Gemini API
            </footer>
        </div>
      </div>

      {/* Visible download button */}
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className="flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-500 transition-all duration-300 text-sm disabled:bg-gray-500 disabled:cursor-wait"
        title="Скачать PDF-отчет"
      >
        {isGenerating ? (
            <Loader small={true} />
        ) : (
            <DownloadIcon className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Отчёт</span>
      </button>
    </>
  );
};