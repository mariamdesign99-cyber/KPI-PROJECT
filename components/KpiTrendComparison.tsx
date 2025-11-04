import React, { useState, useMemo, useEffect } from 'react';
import type { Kpi, ChatMessage } from '../App';
import { MainKpiChart } from './MainKpiChart';
import { generateOverallAnalysis } from '../services/geminiService';
import { OverallAnalysisChatModal } from './OverallAnalysisModal';
import { Loader } from './Loader';
import { SparklesIcon, TrendingUpIcon, TrendingDownIcon, MessageSquarePlusIcon } from './icons';
import { AnalysisActions } from './AnalysisActions';

interface KpiTrendComparisonProps {
    kpis: Kpi[];
    periodText: string;
}

const KPI_COLORS = ['#38bdf8', '#fb923c', '#a78bfa', '#4ade80', '#f472b6', '#2dd4bf'];
const MAX_SELECTED_KPIS = 4;

const simpleMarkdownParse = (text: string) => {
    return text
        .replace(/^# (.*$)/gim, '') // Remove H1
        .replace(/^## (.*$)/gim, '<h3 class="text-md font-semibold text-gray-800 dark:text-gray-300 mt-4 mb-2">$1</h3>')
        .replace(/^\s*-\s\*\*(.*?)\*\*:\s*(.*$)/gim, '<p><strong class="font-semibold text-gray-700 dark:text-gray-300">$1:</strong> $2</p>')
        .replace(/^\s*-\s(.*$)/gim, '<li class="ml-4">$1</li>')
        .replace(/\n/g, '<br />');
};

export const KpiTrendComparison: React.FC<KpiTrendComparisonProps> = ({ kpis, periodText }) => {
    const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([kpis[0]?.id, kpis[1]?.id].filter(Boolean));
    const [overallAnalysis, setOverallAnalysis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

    const handleSelectionChange = (kpiId: string) => {
        setSelectedKpiIds(prev => {
            if (prev.includes(kpiId)) {
                return prev.filter(id => id !== kpiId);
            }
            if (prev.length < MAX_SELECTED_KPIS) {
                return [...prev, kpiId];
            }
            return prev; // Limit selection
        });
    };
    
    // Reset analysis when selection changes
    useEffect(() => {
        setOverallAnalysis(null);
        setError(null);
        setChatHistory([]); // Also reset chat history
    }, [selectedKpiIds, periodText]); // Also depends on periodText

    const selectedKpis = useMemo(() => {
        return selectedKpiIds.map(id => kpis.find(kpi => kpi.id === id)).filter((k): k is Kpi => !!k);
    }, [selectedKpiIds, kpis]);
    
    const chartData = useMemo(() => {
        return selectedKpis.map((kpi, index) => ({
            kpi,
            color: KPI_COLORS[index % KPI_COLORS.length]
        }));
    }, [selectedKpis]);

    const handleGenerateAnalysis = async () => {
        if (selectedKpis.length < 2) return;
        
        setIsLoading(true);
        setError(null);
        setOverallAnalysis(null);
        setChatHistory([]);
        
        const analysisInput = {
            kpis: selectedKpis.map(kpi => ({
                title: kpi.title,
                value: kpi.value,
                change: kpi.change,
                changeType: kpi.changeType,
                trendDescription: kpi.change > 0.1 ? 'рост' : kpi.change < -0.1 ? 'снижение' : 'стабильность'
            })),
            period: periodText,
        };
        
        try {
            const result = await generateOverallAnalysis(analysisInput);
            setOverallAnalysis(result);
        } catch (e) {
            console.error(e);
            setError("Не удалось сгенерировать анализ. Попробуйте позже.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
                <div className="w-full h-[28rem] bg-gray-50 dark:bg-gray-950/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <MainKpiChart data={chartData} period={periodText} />
                </div>
                <div className="bg-gray-50 dark:bg-gray-950/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                         <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300">Сводный AI-анализ</h3>
                         <button 
                            onClick={handleGenerateAnalysis}
                            disabled={isLoading || selectedKpis.length < 2}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors text-sm disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                         >
                            <SparklesIcon className="w-5 h-5"/>
                            <span>{isLoading ? 'Анализирую...' : 'Сгенерировать'}</span>
                         </button>
                    </div>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><Loader /></div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500">{error}</div>
                    ) : overallAnalysis ? (
                        <div className="animate-fade-in">
                           <div className="prose prose-sm dark:prose-invert max-w-none p-2 rounded-md"
                                dangerouslySetInnerHTML={{ __html: simpleMarkdownParse(overallAnalysis) }} 
                           />
                           <div className="p-2">
                                <AnalysisActions 
                                    analysisText={overallAnalysis} 
                                    kpiTitle={selectedKpis.map(k => k.title.substring(0,5)).join('_')} 
                                />
                               <button 
                                    onClick={() => setIsModalOpen(true)}
                                    className="mt-4 flex items-center gap-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                               >
                                   <MessageSquarePlusIcon className="w-4 h-4" />
                                   Задать уточняющий вопрос
                               </button>
                           </div>
                        </div>
                    ) : (
                        <p className="text-center py-10 text-gray-500">Выберите от 2 до {MAX_SELECTED_KPIS} показателей и нажмите "Сгенерировать", чтобы получить сводный анализ.</p>
                    )}
                </div>
            </div>
            <aside className="lg:col-span-4 bg-gray-50 dark:bg-gray-950/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold mb-3">Выберите KPI ({selectedKpiIds.length}/{MAX_SELECTED_KPIS})</h3>
                <div className="space-y-2 max-h-[40rem] overflow-y-auto pr-2">
                    {kpis.map((kpi, index) => {
                        const isSelected = selectedKpiIds.includes(kpi.id);
                        const color = KPI_COLORS[selectedKpiIds.indexOf(kpi.id) % KPI_COLORS.length];
                        const isPositive = kpi.change >= 0;
                        return (
                             <label 
                                key={kpi.id} 
                                htmlFor={`kpi-select-${kpi.id}`} 
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${isSelected ? 'bg-white dark:bg-gray-800 border-cyan-500' : 'bg-transparent border-transparent hover:bg-white/70 dark:hover:bg-gray-800/50'}`}
                             >
                                 <input 
                                    type="checkbox"
                                    id={`kpi-select-${kpi.id}`}
                                    checked={isSelected}
                                    disabled={!isSelected && selectedKpiIds.length >= MAX_SELECTED_KPIS}
                                    onChange={() => handleSelectionChange(kpi.id)}
                                    className="h-4 w-4 rounded bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-cyan-500 focus:ring-cyan-600 disabled:opacity-50"
                                />
                                {isSelected ? (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                                        {/* FIX: Add type assertion to fix TypeScript error on cloneElement */}
                                        {React.cloneElement(kpi.icon as React.ReactElement<any>, { className: 'w-4 h-4 text-white' })}
                                    </div>
                                ) : (
                                     // FIX: Add type assertion to fix TypeScript error on cloneElement
                                     React.cloneElement(kpi.icon as React.ReactElement<any>, { className: 'w-6 h-6 text-gray-500 dark:text-gray-400' })
                                )}
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm">{kpi.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.value}</p>
                                </div>
                                <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isPositive ? <TrendingUpIcon className="w-3 h-3"/> : <TrendingDownIcon className="w-3 h-3"/>}
                                    <span>{kpi.change}%</span>
                                </div>
                             </label>
                        );
                    })}
                </div>
            </aside>
            
                        {isModalOpen && overallAnalysis && (
                <OverallAnalysisChatModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    isLoading={isLoading}
                    initialContent={overallAnalysis}
                    error={error}
                    kpis={selectedKpis}
                    period={periodText}
                    chatHistory={chatHistory}
                    onChatUpdate={setChatHistory}
                />
            )}
        </div>
    );
};
export default KpiTrendComparison;
