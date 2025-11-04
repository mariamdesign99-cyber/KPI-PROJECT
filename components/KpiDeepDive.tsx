import React, { useState, useMemo, useEffect } from 'react';
import type { Kpi } from '../App';
import { MainKpiChart } from './MainKpiChart';
import { generateDeepDiveAnalysis } from '../services/geminiService';
import { Loader } from './Loader';
import { SparklesIcon } from './icons';
import { AnalysisActions } from './AnalysisActions';

interface KpiDeepDiveProps {
    kpis: Kpi[];
    periodText: string;
}

const simpleMarkdownParse = (text: string) => {
    return text
        .replace(/### (.*$)/gim, '<h3 class="text-md font-semibold text-gray-800 dark:text-gray-300 mb-2">$1</h3>')
        .replace(/^\s*-\s\*\*(.*?)\*\*:\s*(.*$)/gim, '<p><strong class="font-semibold text-gray-700 dark:text-gray-300">$1:</strong> $2</p>')
        .replace(/^\s*-\s(.*$)/gim, '<li class="ml-4 text-gray-600 dark:text-gray-400">$1</li>')
        .replace(/\n/g, '<br />');
};

export const KpiDeepDive: React.FC<KpiDeepDiveProps> = ({ kpis, periodText }) => {
    const [selectedKpiId, setSelectedKpiId] = useState<string>(kpis[0]?.id || '');
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const selectedKpi = useMemo(() => kpis.find(k => k.id === selectedKpiId), [kpis, selectedKpiId]);

    useEffect(() => {
        if (selectedKpi?.history) {
            const fetchAnalysis = async () => {
                setIsLoading(true);
                setAnalysis(null);
                try {
                    const result = await generateDeepDiveAnalysis(selectedKpi.title, selectedKpi.history, periodText);
                    setAnalysis(result);
                } catch (error) {
                    console.error("Deep dive analysis failed:", error);
                    setAnalysis("Не удалось загрузить анализ.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAnalysis();
        }
    }, [selectedKpi, periodText]);
    
    const stats = useMemo(() => {
        if (!selectedKpi?.history || selectedKpi.history.length === 0) {
            return { avg: 0, min: 0, max: 0, change: 0 };
        }
        const data = selectedKpi.history;
        const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
        const min = Math.min(...data);
        const max = Math.max(...data);
        const change = data.length > 1 ? ((data[data.length - 1] - data[0]) / (data[0] || 1)) * 100 : 0;
        return { avg, min, max, change };
    }, [selectedKpi]);
    
    const formatValue = (value: number) => {
        if (!selectedKpi) return value.toFixed(2);
        if (selectedKpi.value.includes('%')) return `${value.toFixed(2)}%`;
        if (selectedKpi.value.includes('₽')) return value.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
        return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <label htmlFor="kpi-select" className="font-semibold">Выберите KPI для анализа:</label>
                <select id="kpi-select" value={selectedKpiId} onChange={e => setSelectedKpiId(e.target.value)}
                    className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-cyan-500">
                    {kpis.map(kpi => <option key={kpi.id} value={kpi.id}>{kpi.title}</option>)}
                </select>
            </div>
            
            {!selectedKpi ? (
                <div className="text-center py-10 text-gray-500">Выберите KPI для начала анализа.</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="w-full h-80 bg-gray-50 dark:bg-gray-950/50 rounded-md border border-gray-200 dark:border-gray-700">
                             <MainKpiChart data={[{ kpi: selectedKpi, color: '#38bdf8' }]} period={periodText} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                            {[{label: 'Среднее', value: stats.avg}, {label: 'Максимум', value: stats.max}, {label: 'Минимум', value: stats.min}, {label: 'Изменение', value: stats.change}].map(stat => (
                                <div key={stat.label} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <p className={`font-bold text-xl ${stat.label === 'Изменение' ? (stat.value >= 0 ? 'text-green-500' : 'text-red-500') : 'text-gray-800 dark:text-gray-200'}`}>
                                        {stat.label === 'Изменение' ? `${stat.value.toFixed(1)}%` : formatValue(stat.value)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="lg:col-span-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-cyan-500"/> AI-Анализ
                        </h3>
                        {isLoading ? (
                            <div className="flex items-center justify-center h-48"><Loader/></div>
                        ) : (
                            analysis && (
                                <div className="animate-fade-in">
                                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-600 dark:text-gray-400"
                                        dangerouslySetInnerHTML={{ __html: simpleMarkdownParse(analysis || '') }}
                                    />
                                    <AnalysisActions analysisText={analysis} kpiTitle={selectedKpi?.title || 'deep-dive'} />
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
