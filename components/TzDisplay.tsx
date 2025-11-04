import React, { useState, useCallback } from 'react';
import { FileTextIcon, ClipboardIcon, CheckIcon } from './icons';

interface TzDisplayProps {
  content: string;
}

// A simple markdown to HTML converter for basic formatting
const simpleMarkdownParse = (text: string, isDarkMode: boolean) => {
    const h1Class = 'text-3xl font-bold mb-4 text-cyan-600 dark:text-cyan-300';
    const h2Class = 'text-2xl font-semibold mt-6 mb-3 border-b-2 border-gray-200 dark:border-gray-700 pb-2 text-gray-900 dark:text-white';
    const h3Class = 'text-xl font-semibold mt-4 mb-2 text-cyan-700 dark:text-cyan-400';
    const strongClass = 'font-semibold text-gray-800 dark:text-gray-200';
    const liClass = 'ml-6 text-gray-700 dark:text-gray-300';
    const codeClass = 'bg-gray-200 dark:bg-gray-900 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-md text-sm';

    return text
        .replace(/^# (.*$)/gim, `<h1 class="${h1Class}">$1</h1>`)
        .replace(/^## (.*$)/gim, `<h2 class="${h2Class}">$1</h2>`)
        .replace(/^### (.*$)/gim, `<h3 class="${h3Class}">$1</h3>`)
        .replace(/\*\*(.*)\*\*/g, `<strong class="${strongClass}">$1</strong>`)
        .replace(/\n- (.*$)/gim, `<li class="${liClass}">$1</li>`)
        .replace(/`([^`]+)`/g, `<code class="${codeClass}">$1</code>`)
        .replace(/\n/g, '<br />');
};

export const TzDisplay: React.FC<TzDisplayProps> = ({ content }) => {
  const [isCopied, setIsCopied] = useState(false);
  const isDarkMode = document.documentElement.classList.contains('dark');

  const handleCopy = useCallback(() => {
    // We want to copy the raw markdown, not the HTML
    navigator.clipboard.writeText(content).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  }, [content]);

  // Remove the top-level H1 from the content as we render it separately
  const contentWithoutH1 = content.replace(/^# .*/, '').trim();
  const formattedContent = simpleMarkdownParse(contentWithoutH1, isDarkMode);

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg animate-fade-in relative">
        <div className="flex items-center gap-3 mb-4">
            <FileTextIcon className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Техническое Задание (MVP)</h2>
        </div>
        
        <button 
            onClick={handleCopy}
            className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Скопировать ТЗ"
        >
            {isCopied ? (
                <>
                    <CheckIcon className="w-4 h-4 text-green-500" />
                    <span>Скопировано</span>
                </>
            ) : (
                <>
                    <ClipboardIcon className="w-4 h-4" />
                    <span>Копировать</span>
                </>
            )}
        </button>

        <div 
            className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed prose-invert"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
    </div>
  );
};