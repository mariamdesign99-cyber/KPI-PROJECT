import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CalendarIcon } from './icons';

// --- Date Utility Functions ---
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

const subMonths = (date: Date, months: number): Date => {
    const newDate = new Date(date);
    // Handles month wrapping correctly
    newDate.setMonth(newDate.getMonth() - months);
    return newDate;
};

const subYears = (date: Date, years: number): Date => {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() - years);
    return newDate;
};

const formatShort = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// --- Type Definitions ---
type Preset = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
export interface DateRange {
    start: Date | null;
    end: Date | null;
}

interface DateRangePickerProps {
    onChange: (range: DateRange) => void;
    initialRange?: DateRange;
}

// --- Calendar Component ---
const Calendar: React.FC<{
    currentMonth: Date;
    range: DateRange;
    onDateSelect: (date: Date) => void;
    setCurrentMonth: (date: Date) => void;
}> = ({ currentMonth, range, onDateSelect, setCurrentMonth }) => {
    
    const days = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    }, [currentMonth]);
    
    const startOffset = useMemo(() => {
        const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const dayOfWeek = firstDayOfMonth.getDay();
        return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    }, [currentMonth]);
    
    const isSelected = (date: Date) => {
        if (!range.start || !range.end) return false;
        return date >= range.start && date <= range.end;
    };
    const isStart = (date: Date) => range.start && date.getTime() === range.start.getTime();
    const isEnd = (date: Date) => range.end && date.getTime() === range.end.getTime();
    const isToday = (date: Date) => getToday().getTime() === date.getTime();

    return (
        <div className="p-2 w-72">
            <div className="flex justify-between items-center mb-2 px-2">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&lt;</button>
                <span className="font-semibold text-sm capitalize">{currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, -1))} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <div key={day} className="w-8 h-8 flex items-center justify-center">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
                {days.map(date => {
                    const selected = isSelected(date);
                    const start = isStart(date);
                    const end = isEnd(date);
                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => onDateSelect(date)}
                            className={`w-8 h-8 text-sm transition-colors relative
                                ${!selected ? 'hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full' : ''}
                                ${selected ? 'bg-cyan-100 dark:bg-cyan-900/50' : ''}
                                ${start && end ? 'rounded-full' : ''}
                                ${start && !end ? 'rounded-r-none rounded-l-full' : ''}
                                ${end && !start ? 'rounded-l-none rounded-r-full' : ''}
                                ${selected && !start && !end ? 'rounded-none' : ''}
                                ${start || end ? 'bg-cyan-500 text-white' : ''}
                                ${isToday(date) ? 'ring-1 ring-cyan-500' : ''}
                            `}
                        >
                            {date.getDate()}
                        </button>
                    )
                })}
            </div>
        </div>
    )
};

// --- Main Picker Component ---
export const DateRangePicker: React.FC<DateRangePickerProps> = ({ onChange, initialRange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [range, setRange] = useState<DateRange>(initialRange || { start: subDays(getToday(), 6), end: getToday() });
    const [activePreset, setActivePreset] = useState<Preset>('week');
    const [currentMonth, setCurrentMonth] = useState(range.end || new Date());
    
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onChange(range);
    }, [range, onChange]);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handlePresetClick = (preset: Preset) => {
        const today = getToday();
        let newStart: Date;
        switch (preset) {
            case 'day': newStart = today; break;
            case 'week': newStart = subDays(today, 6); break;
            case 'month': newStart = subMonths(today, 1); break;
            case 'quarter': newStart = subMonths(today, 3); break;
            case 'year': newStart = subYears(today, 1); break;
            default: newStart = today;
        }
        setRange({ start: newStart, end: today });
        setActivePreset(preset);
        setIsOpen(false);
    };

    const handleDateSelect = (date: Date) => {
        setActivePreset('custom');
        if (!range.start || (range.start && range.end)) {
            setRange({ start: date, end: null });
        } else {
            const newRange = date < range.start ? { start: date, end: range.start } : { start: range.start, end: date };
            setRange(newRange);
            setIsOpen(false);
        }
    };

    const presets: { id: Preset, label: string }[] = [
        { id: 'day', label: 'День' },
        { id: 'week', label: 'Неделя' },
        { id: 'month', label: 'Месяц' },
        { id: 'quarter', label: 'Квартал' },
        { id: 'year', label: 'Год' },
    ];

    const displayValue = range.start && range.end
        ? `${formatShort(range.start)} - ${formatShort(range.end)}`
        : 'Выберите период';
        
    return (
        <div className="relative" ref={wrapperRef}>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                {presets.map(p => (
                    <button key={p.id} onClick={() => handlePresetClick(p.id)} className={`px-3 py-1 rounded-md text-xs sm:text-sm font-semibold transition-colors ${activePreset === p.id ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        {p.label}
                    </button>
                ))}
                <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600">
                    <CalendarIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>{displayValue}</span>
                </button>
            </div>
            
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 animate-fade-in">
                   <Calendar 
                       currentMonth={currentMonth}
                       range={range}
                       onDateSelect={handleDateSelect}
                       setCurrentMonth={setCurrentMonth}
                   />
                </div>
            )}
        </div>
    );
};