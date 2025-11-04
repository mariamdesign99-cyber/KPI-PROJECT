import React, { useMemo } from 'react';

interface ScatterPlotProps {
    data1: number[];
    data2: number[];
    kpi1Name: string;
    kpi2Name: string;
    color?: string;
}

const PADDING = { top: 20, right: 20, bottom: 50, left: 60 };
const WIDTH = 500;
const HEIGHT = 320;

export const ScatterPlot: React.FC<ScatterPlotProps> = ({ data1, data2, kpi1Name, kpi2Name, color = '#38bdf8' }) => {
    
    const chartWidth = WIDTH - PADDING.left - PADDING.right;
    const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;

    const { points, xMin, xMax, yMin, yMax } = useMemo(() => {
        const n = Math.min(data1.length, data2.length);
        const xMin = Math.min(...data1) * 0.95;
        const xMax = Math.max(...data1) * 1.05;
        const yMin = Math.min(...data2) * 0.95;
        const yMax = Math.max(...data2) * 1.05;

        const points = [];
        for (let i = 0; i < n; i++) {
            const x = PADDING.left + ((data1[i] - xMin) / (xMax - xMin)) * chartWidth;
            const y = PADDING.top + chartHeight - ((data2[i] - yMin) / (yMax - yMin)) * chartHeight;
            points.push({ x, y });
        }
        return { points, xMin, xMax, yMin, yMax };
    }, [data1, data2, chartWidth, chartHeight]);

    const formatTick = (value: number) => {
        if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
        if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
        if (value < 10 && value !== 0) return value.toFixed(1);
        return value.toFixed(0);
    };

    const xTicks = useMemo(() => {
        const ticks = [];
        for (let i = 0; i <= 4; i++) {
            const value = xMin + (i / 4) * (xMax - xMin);
            const x = PADDING.left + (i / 4) * chartWidth;
            ticks.push({ value, x });
        }
        return ticks;
    }, [xMin, xMax, chartWidth]);

    const yTicks = useMemo(() => {
        const ticks = [];
        for (let i = 0; i <= 4; i++) {
            const value = yMin + (i / 4) * (yMax - yMin);
            const y = PADDING.top + chartHeight - (i / 4) * chartHeight;
            ticks.push({ value, y });
        }
        return ticks;
    }, [yMin, yMax, chartHeight]);

    return (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full">
            {/* Axes and Grid */}
            <g className="text-gray-400 dark:text-gray-500 text-xs" fill="none" stroke="currentColor" strokeWidth="0.5">
                {xTicks.map(tick => (
                    <g key={tick.x} transform={`translate(${tick.x}, 0)`}>
                        <line y1={PADDING.top} y2={HEIGHT - PADDING.bottom} strokeDasharray="2,3" opacity="0.5" />
                        <text fill="currentColor" stroke="none" x="0" y={HEIGHT - PADDING.bottom + 15} textAnchor="middle">{formatTick(tick.value)}</text>
                    </g>
                ))}
                {yTicks.map(tick => (
                    <g key={tick.y} transform={`translate(0, ${tick.y})`}>
                        <line x1={PADDING.left} x2={WIDTH - PADDING.right} strokeDasharray="2,3" opacity="0.5" />
                        <text fill="currentColor" stroke="none" x={PADDING.left - 8} y="4" textAnchor="end">{formatTick(tick.value)}</text>
                    </g>
                ))}
            </g>

            {/* Axis Labels */}
            <text x={PADDING.left + chartWidth / 2} y={HEIGHT - 5} textAnchor="middle" className="text-sm font-semibold fill-current text-gray-600 dark:text-gray-400">{kpi1Name}</text>
            <text transform={`translate(20, ${PADDING.top + chartHeight / 2}) rotate(-90)`} textAnchor="middle" className="text-sm font-semibold fill-current text-gray-600 dark:text-gray-400">{kpi2Name}</text>

            {/* Points */}
            <g>
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity="0.7" />
                ))}
            </g>
        </svg>
    );
};
