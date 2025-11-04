import React, { useState, useRef, useEffect } from 'react';
import { ClipboardIcon, CheckIcon, DownloadIcon } from './icons';
import { generatePdfFromMarkdown } from '../services/reportService';

interface AnalysisActionsProps {
    analysisText: string;
    kpiTitle: string;
}

export const AnalysisActions: React.FC<AnalysisActionsProps> = ({ analysisText, kpiTitle }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(analysisText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    
    const handleDownload = async (format: 'pdf' | 'excel') => {
        setIsMenuOpen(false);
        const fileName = `analysis-${kpiTitle.toLowerCase().replace(/\s/g, '_')}`;
        
        if (format === 'pdf') {
            await generatePdfFromMarkdown(analysisText, `Анализ: ${kpiTitle}`, `${fileName}.pdf`);
        } else { // 'excel' downloads a csv for simplicity
            const csvContent = `"${analysisText.replace(/"/g, '""')}"`;
            const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
                {isCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                <span>{isCopied ? 'Скопировано' : 'Копировать'}</span>
            </button>
            <div className="relative">
                <button 
                     ref={buttonRef}
                     onClick={() => setIsMenuOpen(!isMenuOpen)}
                     className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Скачать</span>
                </button>
                {isMenuOpen && (
                    <div ref={menuRef} className="absolute bottom-full mb-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-10 animate-fade-in">
                        <button onClick={() => handleDownload('pdf')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">PDF-документ</button>
                        <button onClick={() => handleDownload('excel')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Excel (.csv)</button>
                    </div>
                )}
            </div>
        </div>
    );
};
