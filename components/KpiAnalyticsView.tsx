import React, { useState } from 'react';
import type { Kpi } from '../App';
import { BarChartIcon, ZoomInIcon, GitCompareArrowsIcon } from './icons';
import { KpiTrendComparison } from './KpiTrendComparison';
import { KpiDeepDive } from './KpiDeepDive';
import { KpiCorrelation } from './KpiCorrelation';

interface KpiAnalyticsViewProps {
    kpiData: Kpi[];
    periodText: string;
}

type AnalyticsTab = 'trends' | 'deep-dive' | 'correlation';

export const KpiAnalyticsView: React.FC<KpiAnalyticsViewProps> = ({ kpiData, periodText }) => {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('trends');
    
    const tabs = [
        { id: 'trends', label: 'Сравнение трендов', icon: <BarChartIcon className="w-5 h-5" /> },
        { id: 'deep-dive', label: 'Глубокий анализ', icon: <ZoomInIcon className="w-5 h-5" /> },
        { id: 'correlation', label: 'Анализ корреляций', icon: <GitCompareArrowsIcon className="w-5 h-5" /> }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'trends':
                return <KpiTrendComparison kpis={kpiData} periodText={periodText} />;
            case 'deep-dive':
                return <KpiDeepDive kpis={kpiData} periodText={periodText} />;
            case 'correlation':
                return <KpiCorrelation kpis={kpiData} />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Аналитика KPI</h2>
                <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as AnalyticsTab)}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="animate-fade-in">
                {renderContent()}
            </div>
        </div>
    );
};
