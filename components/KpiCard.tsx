import React, { useState, useEffect, useRef } from 'react';
import type { Kpi } from '../App';
// FIX: Import the 'AnalysisResult' type to resolve the 'Cannot find name' error.
import type { AnalysisResult } from '../services/aiAnalysisService';
import { 
    SparklesIcon, TrendingUpIcon, TrendingDownIcon, PinIcon
} from './icons';

// --- TYPE DEFINITIONS ---
export interface GeminiText {
  summary: string;
  recommendations: string;
}

export interface AnalysisData {
  analysisResult: AnalysisResult;
  geminiText: GeminiText;
}

// --- HELPER COMPONENTS ---

// Utility to format numbers based on their type for display.
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

// Component for animating the number value with an ease-out effect.
const AnimatedNumber: React.FC<{ value: number; valueType: string; }> = ({ value, valueType }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const startValueRef = useRef(0);
    // FIX: Initialize useRef with null and provide a more accurate type to avoid potential errors and satisfy stricter TypeScript rules.
    const animationFrameRef = useRef<number | null>(null);
    const duration = 1200; // Animation duration in milliseconds

    useEffect(() => {
        // When the target value changes, we start a new animation
        // from the current display value to the new target value.
        startValueRef.current = displayValue;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            if (elapsedTime < duration) {
                const progress = elapsedTime / duration;
                // Ease-out cubic function for a smooth stop
                const easeOutProgress = 1 - Math.pow(1 - progress, 3);
                const currentVal = startValueRef.current + (value - startValueRef.current) * easeOutProgress;
                setDisplayValue(currentVal);
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                // Ensure the final value is precise
                setDisplayValue(value);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        // Cleanup function to cancel the animation if the component unmounts
        // or the value changes again mid-animation.
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [value]);

    return (
        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {formatValue(displayValue, valueType)}
        </p>
    );
};

// Enhanced Sparkline with an entrance animation.
const Sparkline: React.FC<{ data: number[]; change: number }> = ({ data, change }) => {
    const isPositive = change >= 0;
    const color = isPositive ? 'stroke-green-500' : 'stroke-red-500';
    
    if (!data || data.length < 2) {
        return <div className="w-24 h-10 bg-gray-100 dark:bg-gray-800/50 rounded" />;
    }
    
    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal;

    // Normalize data points to fit the SVG viewbox
    const normalizedData = range > 0 
        ? data.map(d => 40 - ((d - minVal) / range) * 35)
        : data.map(() => 20); // Flat line if no variation

    const points = normalizedData.map((d, i) => `${(i / (data.length - 1)) * 100},${d}`).join(' ');

    return (
        <svg className="w-24 h-10" viewBox="0 0 100 40">
            {/* The key on this component in the parent will trigger a re-mount,
                and thus the `animate-fade-in` animation will run again. */}
            <polyline fill="none" strokeWidth="2" points={points} className={`${color} animate-fade-in`} />
        </svg>
    );
};


// --- MAIN KPI CARD COMPONENT ---
interface KpiCardProps {
    kpi: Kpi;
    isPinned: boolean;
    onPinToggle: () => void;
    onOpenAnalysis: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({ kpi, isPinned, onPinToggle, onOpenAnalysis }) => {
    const isPositive = kpi.change >= 0;

    return (
        <div className="group bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg flex flex-col justify-between transition-all duration-300 hover:shadow-cyan-500/10 dark:hover:shadow-cyan-400/10 hover:border-cyan-400 dark:hover:border-cyan-700 hover:-translate-y-1 min-h-[180px]">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                         {React.cloneElement(kpi.icon as React.ReactElement<any>, { className: 'w-7 h-7 text-cyan-600 dark:text-cyan-400' })}
                        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">{kpi.title}</h3>
                    </div>
                    <button onClick={onPinToggle} title={isPinned ? "Открепить" : "Закрепить"} className={`p-1.5 rounded-full transition-colors ${isPinned ? 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/50' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                        <PinIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <AnimatedNumber value={kpi.rawValue || 0} valueType={kpi.valueType || 'integer'} />
                        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? <TrendingUpIcon className="w-4 h-4"/> : <TrendingDownIcon className="w-4 h-4"/>}
                            <span>{isPositive ? '+' : ''}{kpi.change}% vs. last {kpi.changeType}</span>
                        </div>
                    </div>
                    <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                        <Sparkline key={kpi.history?.join('-')} data={kpi.history || []} change={kpi.change} />
                    </div>
                </div>
            </div>

            <div className="mt-4 w-full">
                <button 
                    onClick={onOpenAnalysis}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-cyan-700 dark:text-cyan-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-cyan-600 dark:hover:text-cyan-200 transition-all duration-300 text-xs"
                >
                    <SparklesIcon className="w-4 h-4" />
                    <span>AI-анализ</span>
                </button>
            </div>
        </div>
    );
};