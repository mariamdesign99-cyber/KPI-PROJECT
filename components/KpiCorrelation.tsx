import React, { useState, useMemo, useEffect } from 'react';
import type { Kpi, ChatMessage } from '../App';
import { ScatterPlot } from './ScatterPlot';
import { generateCorrelationAnalysis } from '../services/geminiService';
import { Loader } from './Loader';
import { SparklesIcon, MessageSquarePlusIcon } from './icons';
import { CorrelationChatModal } from './CorrelationChatModal';
import { AnalysisActions } from './AnalysisActions';

interface KpiCorrelationProps {
    kpis: Kpi[];
}

const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b) / n;

    let numerator = 0;
    // FIX: Removed corrupted code and correctly initialized variables.
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }

    if (denomX === 0 || denomY === 0) return 0;
    return numerator / Math.sqrt(denomX * denomY);
};

export const KpiCorrelation: React.FC<KpiCorrelationProps> = ({ kpis }) => {
    const validKpis = useMemo(() => kpis.filter(k => k.history && k.history.length > 1), [kpis]);

    const [kpi1Id, setKpi1Id] = useState<string>(validKpis[0]?.id || '');
    const [kpi2Id, setKpi2Id] = useState<string>(validKpis[1]?.id || validKpis[0]?.id || '');
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);


    const kpi1 = useMemo(() => validKpis.find(k => k.id === kpi1Id), [validKpis, kpi1Id]);
    const kpi2 = useMemo(() => validKpis.find(k => k.id === kpi2Id), [validKpis, kpi2Id]);

    const correlation = useMemo(() => {
        if (!kpi1?.history || !kpi2?.history || kpi1.id === kpi2.id) {
            return kpi1?.id === kpi2?.id ? 1 : 0;
        }
        return calculateCorrelation(kpi1.history, kpi2.history);
    }, [kpi1, kpi2]);

    useEffect(() => {
        // Reset chat when KPIs change
        setChatHistory([]);

        if (kpi1 && kpi2 && kpi1.id !== kpi2.id) {
            const fetchAnalysis = async () => {
                setIsLoading(true);
                setAnalysis(null);
                try {
                    const result = await generateCorrelationAnalysis(kpi1.title, kpi2.title, correlation);
                    setAnalysis(result);
                } catch (error) {
                    console.error("Correlation analysis failed:", error);
                    setAnalysis("Не удалось загрузить анализ.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAnalysis();
        } else {
            setAnalysis(kpi1?.id === kpi2?.id ? "Показатель всегда идеально коррелирует сам с собой." : "Выберите два разных показателя для анализа.");
        }
    }, [kpi1, kpi2, correlation]);

    const getCorrelationColor = (corr: number) => {
        const absCorr = Math.abs(corr);
        if (absCorr >= 0.6) return 'text-green-500';
        if (absCorr >= 0.3) return 'text-yellow-500';
        return 'text-gray-500 dark:text-gray-400';
    };

    if (validKpis.length < 2) {
        return <div className="text-center py-10 text-gray-500">Недостаточно данных для анализа корреляций. Требуется как минимум два KPI с историей.</div>
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="kpi1-select" className="font-semibold text-sm">Показатель X:</label>
                        <select id="kpi1-select" value={kpi1Id} onChange={e => setKpi1Id(e.target.value)}
                            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-cyan-500">
                            {validKpis.map(kpi => <option key={kpi.id} value={kpi.id}>{kpi.title}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="kpi2-select" className="font-semibold text-sm">Показатель Y:</label>
                        <select id="kpi2-select" value={kpi2Id} onChange={e => setKpi2Id(e.target.value)}
                            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-cyan-500">
                            {validKpis.map(kpi => <option key={kpi.id} value={kpi.id}>{kpi.title}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 w-full h-80 bg-gray-50 dark:bg-gray-950/50 rounded-md border border-gray-200 dark:border-gray-700 p-2">
                        {kpi1?.history && kpi2?.history ? (
                            <ScatterPlot 
                                data1={kpi1.history} 
                                data2={kpi2.history} 
                                kpi1Name={kpi1.title} 
                                kpi2Name={kpi2.title} 
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">Выберите два KPI для построения графика.</div>
                        )}
                    </div>
                    <div className="lg:col-span-1 space-y-4">
                         <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Коэф. корреляции</p>
                            <p className={`font-bold text-4xl ${getCorrelationColor(correlation)}`}>
                                {correlation.toFixed(3)}
                            </p>
                        </div>
                         <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[180px]">
                            <h3 className="text-md font-bold mb-2 flex items-center gap-2">
                                 <SparklesIcon className="w-5 h-5 text-cyan-500"/> AI-Интерпретация
                            </h3>
                             {isLoading ? (
                                <div className="flex items-center justify-center h-24"><Loader/></div>
                            ) : (
                                <div className="space-y-3 animate-fade-in">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{analysis}</p>
                                    {analysis && kpi1?.id !== kpi2?.id && (
                                        <div>
                                            <button 
                                                onClick={() => setIsModalOpen(true)}
                                                className="flex items-center gap-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline mb-2"
                                            >
                                               <MessageSquarePlusIcon className="w-4 h-4" />
                                               Задать уточняющий вопрос
                                           </button>
                                           <AnalysisActions analysisText={analysis} kpiTitle={`${kpi1?.title}-vs-${kpi2?.title}`} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {isModalOpen && kpi1 && kpi2 && analysis && (
                <CorrelationChatModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    kpi1={kpi1}
                    kpi2={kpi2}
                    correlation={correlation}
                    initialAnalysis={analysis}
                    chatHistory={chatHistory}
                    onChatUpdate={setChatHistory}
                />
            )}
        </>
    );
};
