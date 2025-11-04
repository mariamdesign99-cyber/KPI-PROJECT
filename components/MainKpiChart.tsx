import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Kpi } from '../App';

interface ChartProps {
    data: { kpi: Kpi; color: string }[];
    period: string;
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

export const MainKpiChart: React.FC<ChartProps> = ({ data, period }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; dataIndex: number } | null>(null);
    const [dimensions, setDimensions] = useState({ width: 500, height: 320 });

    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setDimensions({ width, height });
            }
        });
        if (svgRef.current?.parentElement) {
            resizeObserver.observe(svgRef.current.parentElement);
        }
        return () => resizeObserver.disconnect();
    }, []);

    const chartWidth = dimensions.width - PADDING.left - PADDING.right;
    const chartHeight = dimensions.height - PADDING.top - PADDING.bottom;

    const { combinedData, yMax, xPoints } = useMemo(() => {
        if (data.length === 0 || data.some(d => !d.kpi.history || d.kpi.history.length === 0)) {
            return { combinedData: [], yMax: 100, xPoints: [] };
        }
        
        const allValues = data.flatMap(d => d.kpi.history || []);
        if(allValues.length === 0) return { combinedData: [], yMax: 100, xPoints: [] };

        const yMaxVal = Math.max(...allValues);
        const yMax = yMaxVal === 0 ? 100 : yMaxVal * 1.1; // 10% padding
        
        const numPoints = data[0]?.kpi.history?.length || 0;
        const xPoints = Array.from({ length: numPoints }, (_, i) => PADDING.left + (i / (numPoints - 1)) * chartWidth);
        
        return { combinedData: data, yMax, xPoints };
    }, [data, chartWidth]);

    const getPath = (history: number[] | undefined) => {
        if (!history || history.length === 0 || yMax === 0) return "";
        return history
            .map((point, i) => {
                const x = xPoints[i];
                const y = PADDING.top + chartHeight - (point / yMax) * chartHeight;
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(' ');
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (xPoints.length === 0) return;
        const svg = e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        
        const dataIndex = Math.round(((svgP.x - PADDING.left) / chartWidth) * (xPoints.length - 1));
        
        if (dataIndex >= 0 && dataIndex < xPoints.length) {
            setTooltip({
                x: xPoints[dataIndex],
                y: svgP.y,
                dataIndex: dataIndex
            });
        }
    };
    
    const handleMouseLeave = () => {
        setTooltip(null);
    };

    const yTicks = useMemo(() => {
        if (!yMax || chartHeight <= 0) return [];
        const ticks = [];
        for (let i = 0; i <= 5; i++) {
            const value = (yMax / 5) * i;
            const y = PADDING.top + chartHeight - (value / yMax) * chartHeight;
            ticks.push({ value, y });
        }
        return ticks;
    }, [yMax, chartHeight]);

    return (
        <div className="relative w-full h-full">
            <svg ref={svgRef} className="w-full h-full" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                {/* Y-Axis */}
                <g className="text-gray-400 dark:text-gray-500 text-xs">
                    {yTicks.map(tick => (
                        <g key={tick.y}>
                            <line x1={PADDING.left} y1={tick.y} x2={dimensions.width - PADDING.right} y2={tick.y} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,3" opacity="0.5" />
                            <text x={PADDING.left - 8} y={tick.y + 4} textAnchor="end">{tick.value > 1000 ? `${(tick.value/1000).toFixed(1)}k` : tick.value.toFixed(0)}</text>
                        </g>
                    ))}
                </g>

                {/* Data Lines */}
                {combinedData.map(({ kpi, color }) => (
                    <path key={kpi.id} d={getPath(kpi.history)} fill="none" stroke={color} strokeWidth="2" />
                ))}
                
                 {/* Tooltip */}
                {tooltip && (
                    <g>
                        <line x1={tooltip.x} y1={PADDING.top} x2={tooltip.x} y2={dimensions.height - PADDING.bottom} stroke="currentColor" className="text-gray-500 dark:text-gray-400" strokeWidth="1" strokeDasharray="3,3" />
                        {combinedData.map(({ kpi, color }) => {
                             if (!kpi.history || yMax === 0) return null;
                             const y = PADDING.top + chartHeight - (kpi.history[tooltip.dataIndex] / yMax) * chartHeight;
                             return <circle key={kpi.id} cx={tooltip.x} cy={y} r="4" fill={color} className="stroke-gray-50 dark:stroke-gray-950" strokeWidth="2" />;
                        })}
                    </g>
                )}
            </svg>
            
            {/* Tooltip Content (HTML) */}
            {tooltip && (
                <div className="absolute bg-gray-800/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-600 dark:border-gray-700 rounded-lg p-2 text-xs shadow-lg pointer-events-none"
                     style={{
                         left: `${tooltip.x + 10}px`, 
                         top: `${tooltip.y - 40}px`,
                         transform: `translateX(${tooltip.x > dimensions.width / 2 ? '-110%' : '0'})`
                     }}>
                    {combinedData.map(({ kpi, color }) => (
                         <div key={kpi.id} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{backgroundColor: color}}></span>
                                <span className="text-gray-300">{kpi.title}:</span>
                            </div>
                            <span className="font-bold text-white">{kpi.history?.[tooltip.dataIndex].toLocaleString('ru-RU', {maximumFractionDigits: 2})}</span>
                        </div>
                    ))}
                </div>
            )}

            {data.length === 0 && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <p className="text-gray-500">Выберите KPI для сравнения</p>
                 </div>
            )}
        </div>
    );
};