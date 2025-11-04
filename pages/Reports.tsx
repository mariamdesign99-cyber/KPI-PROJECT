

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DownloadIcon, FilePieChartIcon, SparklesIcon, CalendarIcon, BriefcaseIcon, BotIcon, SendIcon } from '../components/icons';
import { DateRangePicker, type DateRange } from '../components/DateRangePicker';
import { Loader } from '../components/Loader';
import { MainKpiChart } from '../components/MainKpiChart';
import { generateReportData, generatePdf, generateCsv, type ReportData } from '../services/reportService';
import { generateReportAnalysis, generateReportChatResponseStream } from '../services/geminiService';
import { AnalysisActions } from '../components/AnalysisActions';
import type { ChatMessage } from '../App';


// --- UTILITY & HELPER COMPONENTS ---
const getToday = (): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};
const subDays = (date: Date, days: number): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - days);
    return newDate;
};

const ReportMetricCard: React.FC<{ metric: ReportData['kpis'][0] }> = ({ metric }) => {
    const isPositive = metric.change.startsWith('+');
    return (
        <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    {/* FIX: Add type assertion to fix TypeScript error on cloneElement */}
                    {React.cloneElement(metric.icon as React.ReactElement<any>, { className: 'w-5 h-5 text-gray-500' })}
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{metric.label}</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
            </div>
            <p className={`text-md font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>{metric.change}</p>
        </div>
    );
};

const DownloadButton: React.FC<{ onDownload: (format: 'pdf' | 'csv' | 'excel') => void, disabled: boolean, isLoading: boolean }> = ({ onDownload, disabled, isLoading }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (format: 'pdf' | 'csv' | 'excel') => {
        onDownload(format);
        setIsOpen(false);
    };

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors text-sm disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {isLoading ? <Loader small /> : <DownloadIcon className="w-5 h-5" />}
                <span>{isLoading ? 'Подготовка...' : 'Скачать'}</span>
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 animate-fade-in">
                    <button onClick={() => handleSelect('pdf')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">PDF-документ</button>
                    <button onClick={() => handleSelect('excel')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Excel (.csv)</button>
                    <button onClick={() => handleSelect('csv')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">CSV-файл</button>
                </div>
            )}
        </div>
    );
}

// --- MAIN COMPONENT ---
export const Reports: React.FC = () => {
    const [reportType, setReportType] = useState('financial');
    const [dateRange, setDateRange] = useState<DateRange>({ start: subDays(getToday(), 29), end: getToday() });
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // AI Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [aiChatHistory, setAiChatHistory] = useState<ChatMessage[]>([]);
    const [aiChatInput, setAiChatInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [streamingResponse, setStreamingResponse] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);


    const periodText = useMemo(() => {
        if (!dateRange.start || !dateRange.end) return 'выбранный период';
        return `${dateRange.start.toLocaleDateString('ru-RU')} - ${dateRange.end.toLocaleDateString('ru-RU')}`;
    }, [dateRange]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [aiChatHistory, streamingResponse]);

    const simpleMarkdownParse = (text: string) => {
        return text
            .replace(/### (.*$)/gim, '<h3 class="text-md font-semibold text-gray-800 dark:text-gray-300 mb-2 mt-4">$1</h3>')
            .replace(/^\s*-\s\*\*(.*?)\*\*:\s*(.*$)/gim, '<p><strong class="font-semibold text-gray-700 dark:text-gray-300">$1:</strong> $2</p>')
            .replace(/^\s*-\s(.*$)/gim, '<li class="ml-4 list-disc list-inside">$1</li>')
            .replace(/\n/g, '<br />');
    };

    const handleGenerateReport = () => {
        if (!dateRange.start || !dateRange.end) return;
        setIsGenerating(true);
        setAiAnalysis(null);
        setAiChatHistory([]);
        setReportData(null);
        // Simulate API call
        setTimeout(() => {
            const data = generateReportData(reportType, { start: dateRange.start!, end: dateRange.end! });
            setReportData(data);
            setIsGenerating(false);
        }, 1500);
    };

    const handleDownload = async (format: 'pdf' | 'csv' | 'excel') => {
        if (!reportData) return;

        setIsDownloading(true);
        const reportName = `${reportData.title.toLowerCase().replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`;
        
        await new Promise(res => setTimeout(res, 500)); 

        try {
            switch (format) {
                case 'pdf':
                    await generatePdf('report-for-pdf', `${reportName}.pdf`);
                    break;
                case 'csv':
                case 'excel': 
                    generateCsv(reportData, `${reportName}.csv`);
                    break;
            }
        } catch (error) {
            console.error("Download failed:", error);
            alert('Не удалось скачать отчет.');
        } finally {
            setIsDownloading(false);
        }
    };
    
    const handleGetAiAnalysis = async () => {
        if (!reportData) return;
        setIsAnalyzing(true);
        setAiAnalysis(null);
        setAiChatHistory([]);
        try {
            const analysis = await generateReportAnalysis({
                kpis: reportData.kpis,
                period: periodText,
            });
            setAiAnalysis(analysis);
        } catch (e) {
            console.error(e);
            setAiAnalysis("Произошла ошибка при генерации анализа. Пожалуйста, попробуйте еще раз.");
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleAiChatSendMessage = async (message: string) => {
        if (!message.trim() || isThinking || !reportData || !aiAnalysis) return;

        const newUserMessage: ChatMessage = { role: 'user', text: message };
        const currentHistory = [...aiChatHistory, newUserMessage];
        setAiChatHistory(currentHistory);
        setAiChatInput("");
        setIsThinking(true);
        setStreamingResponse("");

        let finalResponse = "";
        try {
            const stream = generateReportChatResponseStream({
                reportData,
                period: periodText,
                initialAnalysis: aiAnalysis,
                chatHistory: currentHistory,
                newUserQuestion: message,
            });
            for await (const chunk of stream) {
                finalResponse += chunk;
                setStreamingResponse(finalResponse);
            }
        } catch (e) {
            console.error(e);
            finalResponse = "Произошла ошибка при обработке вашего запроса.";
        } finally {
            if (finalResponse) {
                const newModelMessage: ChatMessage = { role: 'model', text: finalResponse };
                setAiChatHistory([...currentHistory, newModelMessage]);
            }
            setIsThinking(false);
            setStreamingResponse(null);
        }
    };


    const chartDataForComponent = useMemo(() => {
        return reportData?.chartData.datasets.map((ds, index) => ({
            kpi: { title: ds.label, history: ds.data } as any,
            color: ['#38bdf8', '#fb923c'][index % 2]
        })) || [];
    }, [reportData]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Hidden element for PDF generation */}
            {reportData && (
                <div style={{ position: 'absolute', left: '-9999px', width: '210mm', fontFamily: 'Inter, sans-serif' }} className="p-8 bg-white text-gray-800">
                    <div id="report-for-pdf" className="w-full h-full flex flex-col">
                        <header className="pb-4 border-b border-gray-300">
                            <h1 className="text-3xl font-bold text-gray-900">{reportData.title}</h1>
                            <p className="text-md text-gray-600">Период: {periodText}</p>
                            <p className="text-sm text-gray-500">Дата генерации: {new Date().toLocaleDateString('ru-RU')}</p>
                        </header>
                        <main className="flex-grow pt-6">
                            <h2 className="text-xl font-semibold mb-3">Ключевые показатели</h2>
                            <table className="w-full text-left">
                                <thead className="border-b border-gray-300">
                                    <tr>
                                        <th className="py-2 px-2">Показатель</th>
                                        <th className="py-2 px-2">Значение</th>
                                        <th className="py-2 px-2">Изменение</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.kpis.map((kpi, index) => (
                                        <tr key={index} className="border-b border-gray-200">
                                            <td className="py-2 px-2 font-medium">{kpi.label}</td>
                                            <td className="py-2 px-2">{kpi.value}</td>
                                            <td className="py-2 px-2">{kpi.change}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                             <h2 className="text-xl font-semibold mt-6 mb-3">Динамика</h2>
                             <p className="text-gray-600">Графическое представление данных не включено в эту версию PDF-отчета.</p>
                        </main>
                         <footer className="text-center pt-4 mt-8 text-xs text-gray-500 border-t border-gray-300">
                            Отчет сгенерирован платформой KPI-Аналитика
                        </footer>
                    </div>
                </div>
            )}
            
            <header>
                <h1 className="text-xl font-semibold tracking-tight">Генератор отчетов</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Создавайте и экспортируйте отчеты по ключевым метрикам</p>
            </header>

            <div id="tour-step-6-report-generator" className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                             <BriefcaseIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                             <label htmlFor="report-type" className="text-sm font-semibold">Тип отчета:</label>
                        </div>
                        <select id="report-type" value={reportType} onChange={e => setReportType(e.target.value)} className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-cyan-500">
                            <option value="financial">Финансы</option>
                            <option value="sales">Продажи</option>
                            <option value="marketing">Маркетинг</option>
                            <option value="kpi_summary">Сводка KPI</option>
                        </select>
                    </div>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                        <DateRangePicker onChange={setDateRange} initialRange={dateRange} />
                        <button 
                            onClick={handleGenerateReport} 
                            disabled={isGenerating}
                            className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                        >
                            {isGenerating ? <Loader small /> : <FilePieChartIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
                            <span>{isGenerating ? 'Генерация...' : 'Сгенерировать отчет'}</span>
                        </button>
                         <button 
                            onClick={handleGetAiAnalysis}
                            disabled={isGenerating || !reportData || isAnalyzing}
                            className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                        >
                            {isAnalyzing ? <Loader small /> : <SparklesIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
                            <span>{isAnalyzing ? 'Анализ...' : 'AI-анализ'}</span>
                        </button>
                         <DownloadButton 
                            onDownload={handleDownload}
                            disabled={!reportData || isGenerating}
                            isLoading={isDownloading}
                        />
                    </div>
                </div>
            </div>

            {isGenerating && (
                 <div className="flex flex-col items-center justify-center text-center p-10 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
                    <Loader />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Формируем ваш отчет. Это может занять несколько секунд...</p>
                </div>
            )}
            
            {!isGenerating && !reportData && (
                 <div className="text-center p-10 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
                    <FilePieChartIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Ваш отчет появится здесь</h3>
                    <p className="text-gray-500 dark:text-gray-400">Выберите тип отчета, период и нажмите "Сгенерировать".</p>
                </div>
            )}

            {reportData && !isGenerating && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                            <h2 className="text-2xl font-bold">{reportData.title}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Период: {periodText}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {reportData.kpis.map((metric, i) => <ReportMetricCard key={i} metric={metric} />)}
                        </div>
                         <div className="w-full h-80">
                             <MainKpiChart 
                                data={chartDataForComponent} 
                                period={periodText}
                             />
                        </div>
                    </div>
                </div>
            )}
            
            {(isAnalyzing || aiAnalysis) && (
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg animate-fade-in">
                    <h2 className="text-2xl font-bold mb-4">AI-Анализ отчета</h2>
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center text-center p-10">
                            <Loader />
                            <p className="mt-4 text-gray-600 dark:text-gray-400">Анализирую данные... Это может занять несколько секунд.</p>
                        </div>
                    ) : aiAnalysis && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div 
                                    className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400"
                                    dangerouslySetInnerHTML={{ __html: simpleMarkdownParse(aiAnalysis) }}
                                />
                                <AnalysisActions analysisText={aiAnalysis} kpiTitle={reportData?.title || 'report'} />
                            </div>
                            <div className="flex flex-col bg-gray-50 dark:bg-gray-950/50 rounded-lg border border-gray-200 dark:border-gray-700 h-96">
                                <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                                    {aiChatHistory.map((msg, index) => (
                                        <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'model' && <div className="w-7 h-7 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0"><BotIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /></div>}
                                            <div className={`max-w-xs p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {isThinking && streamingResponse !== null && (
                                        <div className="flex items-start gap-2.5 justify-start">
                                            <div className="w-7 h-7 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0"><BotIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /></div>
                                            <div className="max-w-xs p-3 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none">
                                                <p className="whitespace-pre-wrap">
                                                    {streamingResponse}
                                                    <span className="inline-block w-2 h-4 bg-gray-600 animate-pulse ml-1 align-middle"></span>
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <form onSubmit={(e) => { e.preventDefault(); handleAiChatSendMessage(aiChatInput); }} className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={aiChatInput}
                                        onChange={(e) => setAiChatInput(e.target.value)}
                                        placeholder="Задайте вопрос..."
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-cyan-500"
                                        disabled={isThinking}
                                    />
                                    <button type="submit" disabled={!aiChatInput.trim() || isThinking} className="p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                                        <SendIcon className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};