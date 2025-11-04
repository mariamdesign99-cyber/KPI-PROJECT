import React, { useState, useMemo, useEffect } from 'react';
import { 
    DollarSignIcon, ShoppingCartIcon, UsersIcon, MousePointerClickIcon,
    BarChartIcon, LayoutDashboardIcon,
    FilterIcon, BriefcaseIcon, ClipboardListIcon,
} from '../components/icons';
import { DateRangePicker, type DateRange } from '../components/DateRangePicker';
import { KpiCard } from '../components/KpiCard';
import { AiChatModal } from '../components/AiChatModal';
import { KpiAnalyticsView } from '../components/KpiAnalyticsView';
import { generateMockKpiData, performAiAnalysis } from '../services/aiAnalysisService';
import { generateAiAnalysis } from '../services/geminiService';
import { GeminiText, AnalysisData } from '../components/KpiCard';
import { type ChatMessage, type Kpi } from '../App';
import { DataUpdate } from '../components/DataUpdate';
import { KpiCalculator } from '../components/KpiCalculator';

// Base configuration for KPIs
// FIX: Explicitly type baseKpiConfig to ensure correct type inference for category, department, and metricType.
const baseKpiConfig: {
    id: string;
    title: string;
    valueType: 'currency' | 'integer' | 'percent' | 'hours' | string;
    icon: React.ReactElement;
    category: 'Финансы' | 'Маркетинг' | 'Клиенты' | 'HR' | 'Разработка';
    department: 'Отдел продаж' | 'HR-отдел' | 'Отдел разработки' | 'Маркетинг';
    metricType: 'Финансовый' | 'Операционный' | 'Клиентский' | 'HR';
    baseValue: number;
    trend: number;
}[] = [
  {
    id: "revenue",
    title: "Выручка",
    valueType: 'currency',
    icon: <DollarSignIcon />,
    category: 'Финансы',
    department: 'Отдел продаж',
    metricType: 'Финансовый',
    baseValue: 1200000,
    trend: 10000,
  },
  {
    id: "sales",
    title: "Продажи",
    valueType: 'integer',
    icon: <ShoppingCartIcon />,
    category: 'Маркетинг',
    department: 'Отдел продаж',
    metricType: 'Операционный',
    baseValue: 8451,
    trend: 50,
  },
  {
    id: "new_clients",
    title: "Новые клиенты",
    valueType: 'integer',
    icon: <UsersIcon />,
    category: 'Клиенты',
    department: 'Маркетинг',
    metricType: 'Клиентский',
    baseValue: 1204,
    trend: -5,
  },
  {
    id: "conversion",
    title: "Конверсия",
    valueType: 'percent',
    icon: <MousePointerClickIcon />,
    category: 'Маркетинг',
    department: 'Маркетинг',
    metricType: 'Операционный',
    baseValue: 4.8,
    trend: 0.005,
  },
   {
    id: "employee_turnover",
    title: "Текучесть кадров",
    valueType: 'percent',
    icon: <UsersIcon />,
    category: 'HR',
    department: 'HR-отдел',
    metricType: 'HR',
    baseValue: 3.2,
    trend: -0.01,
  },
  {
    id: "ticket_resolution_time",
    title: "Время решения тикета",
    valueType: 'hours',
    icon: <ClipboardListIcon />,
    category: 'Разработка',
    department: 'Отдел разработки',
    metricType: 'Операционный',
    baseValue: 4.8,
    trend: -0.05,
  },
];


type ViewType = 'overview' | 'analytics';

// --- UTILITY FUNCTIONS ---
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

// Generates dynamic KPI data based on a date range
const generateKpiDataForRange = (range: DateRange): Kpi[] => {
    if (!range.start || !range.end) return [];
    
    const diffTime = Math.abs(range.end.getTime() - range.start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const formatValue = (value: number, type: string) => {
         switch(type) {
            case 'currency':
                return value >= 1000000
                    ? `${(value / 1000000).toFixed(1)}M ₽`
                    : value >= 1000
                    ? `${(value / 1000).toFixed(0)}K ₽`
                    : value.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 });
            case 'percent': return `${value.toFixed(1)}%`;
            case 'hours': return `${value.toFixed(1)}ч`;
            default: return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
        }
    };

    return baseKpiConfig.map(kpi => {
        const history = Array.from({ length: diffDays }, (_, i) => {
            const seasonal = Math.sin((i % 7) * (Math.PI / 3.5)) * (kpi.baseValue * 0.1);
            const noise = (Math.random() - 0.5) * (kpi.baseValue * 0.05);
            return Math.max(0, kpi.baseValue + i * kpi.trend * (diffDays / 30) + seasonal + noise);
        });

        const currentValue = history[history.length - 1];
        const previousValue = history[0];
        const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
        
        let changeType = 'day';
        if (diffDays > 90) changeType = 'quarter';
        else if (diffDays > 30) changeType = 'month';
        else if (diffDays > 1) changeType = 'week';


        return {
            ...kpi,
            value: formatValue(currentValue, kpi.valueType),
            rawValue: currentValue,
            change: parseFloat(change.toFixed(1)),
            changeType,
            history,
        };
    });
};


export const Dashboard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<Kpi | null>(null);
  const [modalAnalysisData, setModalAnalysisData] = useState<AnalysisData | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});

  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>({ start: subDays(getToday(), 6), end: getToday() });
  const [pinnedKpis, setPinnedKpis] = useState<string[]>([]);
  
  const [kpiData, setKpiData] = useState<Kpi[]>(() => generateKpiDataForRange(dateRange));

  // Regenerate data when date range changes
  useEffect(() => {
    setKpiData(generateKpiDataForRange(dateRange));
  }, [dateRange]);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedMetricType, setSelectedMetricType] = useState('all');
  
  const handleDataUpdated = (manualUpdates?: Record<string, string>) => {
    // This function can now be simplified or adapted if needed,
    // but the primary data update mechanism is now the date range.
    // For now, let's just re-trigger generation for the current range.
    setKpiData(generateKpiDataForRange(dateRange));
  };


  // Dynamic filter options
  const filterOptions = useMemo(() => ({
    categories: [...new Set(kpiData.map(kpi => kpi.category).filter(Boolean))] as string[],
    departments: [...new Set(kpiData.map(kpi => kpi.department).filter(Boolean))] as string[],
    metricTypes: [...new Set(kpiData.map(kpi => kpi.metricType).filter(Boolean))] as string[],
  }), [kpiData]);

  const periodText = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return 'выбранный период';
    const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'день';
    if (diffDays <= 7) return 'неделю';
    if (diffDays <= 31) return 'месяц';
    if (diffDays <= 92) return 'квартал';
    return 'год';
  }, [dateRange]);


  const handleOpenAnalysisModal = async (kpi: Kpi) => {
    setSelectedKpi(kpi);
    setIsModalOpen(true);
    setIsModalLoading(true);
    setModalError(null);
    setModalAnalysisData(null);

    try {
        const mockData = generateMockKpiData(kpi.id, kpi.history?.length || 90);
        const analysis = performAiAnalysis(mockData, kpi.id);
        
        const geminiResponse = await generateAiAnalysis({
            kpiName: kpi.title,
            trendDescription: analysis.trend.description,
            forecast: analysis.forecast.description,
            drivers: analysis.drivers,
        });
        const summaryMatch = geminiResponse.match(/### ОБЩАЯ ОЦЕНКА\s*([\s\S]*?)\s*### РЕКОМЕНДАЦИИ/);
        const recommendationsMatch = geminiResponse.match(/### РЕКОМЕНДАЦИИ\s*([\s\S]*)/);
        const parsedGeminiText: GeminiText = {
            summary: summaryMatch ? summaryMatch[1].trim() : "Не удалось получить оценку.",
            recommendations: recommendationsMatch ? recommendationsMatch[1].trim() : "Не удалось получить рекомендации."
        };
        setModalAnalysisData({ analysisResult: analysis, geminiText: parsedGeminiText });
    } catch (e) {
        console.error(e);
        setModalError("Ошибка анализа. Попробуйте снова.");
    } finally {
        setIsModalLoading(false);
    }
  };

  const handleCloseModal = () => setIsModalOpen(false);
  
  const handleChatUpdate = (kpiId: string, newHistory: ChatMessage[]) => {
      setChatHistories(prev => ({ ...prev, [kpiId]: newHistory }));
  };

  const handlePinToggle = (kpiId: string) => {
    setPinnedKpis(prev => prev.includes(kpiId) ? prev.filter(id => id !== kpiId) : [...prev, kpiId]);
  };

  const filteredKpis = useMemo(() => {
    return kpiData.filter(kpi => 
        (selectedCategory === 'all' || kpi.category === selectedCategory) &&
        (selectedDepartment === 'all' || kpi.department === selectedDepartment) &&
        (selectedMetricType === 'all' || kpi.metricType === selectedMetricType)
    );
  }, [kpiData, selectedCategory, selectedDepartment, selectedMetricType]);

  const pinnedKpiObjects = useMemo(() => {
    return pinnedKpis.map(id => kpiData.find(kpi => kpi.id === id)).filter(Boolean) as Kpi[];
  }, [pinnedKpis, kpiData]);
  
  const unpinnedKpiObjects = useMemo(() => {
      return filteredKpis.filter(kpi => !pinnedKpis.includes(kpi.id));
  }, [filteredKpis, pinnedKpis]);
  
  
  const renderFilters = () => (
    <div className="flex flex-wrap items-center gap-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
            <FilterIcon className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
            <label htmlFor="category-filter" className="text-sm text-gray-600 dark:text-gray-400">Категория:</label>
            <select id="category-filter" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-cyan-500">
                <option value="all">Все</option>
                {filterOptions.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
        </div>
        <div className="flex items-center gap-2">
            <BriefcaseIcon className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
            <label htmlFor="department-filter" className="text-sm text-gray-600 dark:text-gray-400">Отдел:</label>
            <select id="department-filter" value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-cyan-500">
                <option value="all">Все</option>
                {filterOptions.departments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
            </select>
        </div>
        <div className="flex items-center gap-2">
            <ClipboardListIcon className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
            <label htmlFor="metric-type-filter" className="text-sm text-gray-600 dark:text-gray-400">Тип:</label>
            <select id="metric-type-filter" value={selectedMetricType} onChange={e => setSelectedMetricType(e.target.value)} className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-cyan-500">
                <option value="all">Все</option>
                {filterOptions.metricTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
        </div>
    </div>
  );
  
  return (
    <div className="space-y-6">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Обзор KPI</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ключевые метрики вашего бизнеса</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div id="tour-step-2-daterange">
                  <DateRangePicker onChange={setDateRange} initialRange={dateRange} />
                </div>
                <div id="tour-step-4-viewswitcher" className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg">
                    {(
                        [
                            { id: 'overview', label: 'Обзор', icon: <LayoutDashboardIcon className="w-4 h-4" /> },
                            { id: 'analytics', label: 'Аналитика', icon: <BarChartIcon className="w-4 h-4" /> }
                        ] as const
                    ).map(view => (
                        <button
                            key={view.id}
                            onClick={() => setActiveView(view.id)}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                                activeView === view.id
                                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            {view.icon}
                            <span>{view.label}</span>
                        </button>
                    ))}
                </div>
            </div>
       </header>

      <main className="w-full animate-fade-in" key={dateRange.start?.toISOString()}>
        {activeView === 'overview' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DataUpdate onDataUpdated={handleDataUpdated}/>
                    <KpiCalculator />
                </div>

                <div className="flex justify-end">
                    {renderFilters()}
                </div>
                {pinnedKpiObjects.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-4">Закрепленные KPI</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {pinnedKpiObjects.map((kpi, index) => (
                                <div key={kpi.id} id={index === 0 ? 'tour-step-3-kpicard' : undefined}>
                                  <KpiCard 
                                      kpi={kpi} 
                                      isPinned={true}
                                      onPinToggle={() => handlePinToggle(kpi.id)}
                                      onOpenAnalysis={() => handleOpenAnalysisModal(kpi)}
                                  />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-4">Все показатели</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                        {unpinnedKpiObjects.map((kpi, index) => (
                            <div key={kpi.id} id={index === 0 && pinnedKpiObjects.length === 0 ? 'tour-step-3-kpicard' : undefined}>
                               <KpiCard 
                                    kpi={kpi} 
                                    isPinned={false}
                                    onPinToggle={() => handlePinToggle(kpi.id)}
                                    onOpenAnalysis={() => handleOpenAnalysisModal(kpi)}
                                />
                            </div>
                        ))}
                    </div>
                     {unpinnedKpiObjects.length === 0 && (
                        <div className="text-center py-10 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400">Нет показателей, соответствующих фильтрам.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeView === 'analytics' && (
             <KpiAnalyticsView 
                kpiData={kpiData}
                periodText={periodText}
             />
        )}
      </main>
      
      {isModalOpen && selectedKpi && (
        <AiChatModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          kpi={selectedKpi}
          initialAnalysisData={modalAnalysisData}
          isLoading={isModalLoading}
          error={modalError}
          chatHistory={chatHistories[selectedKpi.id] || []}
          onChatUpdate={(newHistory) => handleChatUpdate(selectedKpi.id, newHistory)}
        />
      )}
    </div>
  );
};