import React from 'react';
import { LayersIcon, UserCheckIcon } from './icons';

export interface Result {
  architecture: string;
  scenarios: string;
}

interface ResultDisplayProps {
  result: Result;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white/70 dark:bg-gray-800/70 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <LayersIcon className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Архитектурное Решение</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{result.architecture}</p>
      </div>

      <div className="bg-white/70 dark:bg-gray-800/70 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <UserCheckIcon className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Пользовательские Сценарии</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{result.scenarios}</p>
      </div>
    </div>
  );
};
