import React, { useState, useMemo } from 'react';
import { calculateKpis, BaseMetrics } from '../services/kpiService';
import { CalculatorIcon, TrendingUpIcon, TrendingDownIcon } from './icons';

// Демонстрационные базовые метрики
const demoBaseMetrics: BaseMetrics = {
  traffic: 50000,          // Количество посетителей
  conversionRate: 0.048,   // Коэффициент конверсии (4.8%)
  avgOrderValue: 2500,     // Средний чек (в рублях)
  costs: 400000,           // Общие затраты (маркетинг, операционные и т.д.)
};

// Определяем, какие KPI мы хотим рассчитать и отобразить
const kpisToDisplay = ['revenue', 'profit', 'roi', 'cpa'];

export const KpiCalculator: React.FC = () => {
  const [trafficChange, setTrafficChange] = useState(0);
  const [costChange, setCostChange] = useState(0);

  const results = useMemo(() => {
    const scenario = {
      traffic: 1 + trafficChange / 100,
      costs: 1 + costChange / 100,
    };
    return calculateKpis(demoBaseMetrics, scenario, kpisToDisplay);
  }, [trafficChange, costChange]);

  const formatValue = (key: string, value: number) => {
    switch (key) {
      case 'roi':
        return `${(value * 100).toFixed(1)}%`;
      case 'revenue':
      case 'profit':
      case 'cpa':
        return `${value.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 })}`;
      default:
        return value.toFixed(2);
    }
  };
  
  const getChangeIndicator = (base: number, alternative: number) => {
      const diff = alternative - base;
      if (Math.abs(diff) < 0.001) return null;
      
      const isPositive = diff > 0;
      const color = isPositive ? 'text-green-500' : 'text-red-500';

      return (
          <span className={`flex items-center text-sm font-semibold ${color}`}>
              {isPositive ? <TrendingUpIcon className="w-4 h-4 mr-1"/> : <TrendingDownIcon className="w-4 h-4 mr-1"/>}
              {diff > 0 ? '+' : ''}{formatValue(results[0].key, diff)}
          </span>
      )
  }

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <CalculatorIcon className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Калькулятор KPI: Альтернативные сценарии</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Панель управления сценарием */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Параметры сценария</h3>
          <div className="space-y-6">
            <div>
              <label htmlFor="traffic-slider" className="flex justify-between items-center text-gray-600 dark:text-gray-300 mb-1">
                <span>Изменение трафика</span>
                <span className={`font-bold ${trafficChange > 0 ? 'text-green-500' : trafficChange < 0 ? 'text-red-500' : 'text-cyan-500 dark:text-cyan-400'}`}>{trafficChange >= 0 ? '+' : ''}{trafficChange}%</span>
              </label>
              <input
                id="traffic-slider"
                type="range"
                min="-50"
                max="50"
                value={trafficChange}
                onChange={(e) => setTrafficChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label htmlFor="cost-slider" className="flex justify-between items-center text-gray-600 dark:text-gray-300 mb-1">
                <span>Изменение затрат</span>
                <span className={`font-bold ${costChange > 0 ? 'text-red-500' : costChange < 0 ? 'text-green-500' : 'text-cyan-500 dark:text-cyan-400'}`}>{costChange >= 0 ? '+' : ''}{costChange}%</span>
              </label>
              <input
                id="cost-slider"
                type="range"
                min="-50"
                max="50"
                value={costChange}
                onChange={(e) => setCostChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
        
        {/* Таблица с результатами */}
        <div>
           <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Сравнение результатов</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="py-2 px-4">Метрика</th>
                            <th className="py-2 px-4 text-right">Базовый</th>
                            <th className="py-2 px-4 text-right">Альтернативный</th>
                            <th className="py-2 px-4 text-right">Изменение</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {results.map(({ key, name, baseValue, alternativeValue }) => (
                            <tr key={key}>
                                <td className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">{name}</td>
                                <td className="py-3 px-4 text-right text-gray-800 dark:text-gray-200">{formatValue(key, baseValue)}</td>
                                <td className="py-3 px-4 text-right font-bold text-cyan-600 dark:text-cyan-300">{formatValue(key, alternativeValue)}</td>
                                <td className="py-3 px-4 text-right">{getChangeIndicator(baseValue, alternativeValue)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};
