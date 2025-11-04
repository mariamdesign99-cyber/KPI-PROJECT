import React, { useState, useEffect, useRef } from 'react';
import { Loader } from './Loader';
import { SparklesIcon, XIcon, ClipboardIcon, CheckIcon, DownloadIcon, SendIcon, BotIcon } from './icons';
import { type ChatMessage, type Kpi } from '../App';
import { generateOverallChatResponseStream } from '../services/geminiService';

interface OverallAnalysisChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    initialContent: string | null;
    error: string | null;
    kpis: Kpi[];
    period: string;
    chatHistory: ChatMessage[];
    onChatUpdate: (newHistory: ChatMessage[]) => void;
}

const quickQuestions = [
    "Какие KPI показали наилучшую динамику?",
    "На что стоит обратить внимание в первую очередь?",
    "Сравни выручку и количество новых клиентов",
];

export const OverallAnalysisChatModal: React.FC<OverallAnalysisChatModalProps> = ({
    isOpen,
    onClose,
    isLoading,
    initialContent,
    error,
    kpis,
    period,
    chatHistory,
    onChatUpdate
}) => {
    const [userInput, setUserInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [streamingResponse, setStreamingResponse] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, streamingResponse]);
    
    useEffect(() => {
        if (initialContent && !isLoading && !error) {
            if (chatHistory.length === 0) {
                onChatUpdate([{ role: 'model', text: initialContent }]);
            }
        }
    }, [initialContent, isLoading, error, onChatUpdate, chatHistory.length]);

    if (!isOpen) return null;

    const handleSendMessage = async (message: string) => {
        if (!message.trim() || isThinking || !initialContent) return;

        const newUserMessage: ChatMessage = { role: 'user', text: message };
        const currentHistory = [...chatHistory, newUserMessage];
        onChatUpdate(currentHistory);
        setUserInput("");
        setIsThinking(true);
        setStreamingResponse("");

        let finalResponse = "";
        try {
            const stream = generateOverallChatResponseStream({
                kpis,
                period,
                initialAnalysis: initialContent,
                chatHistory: currentHistory,
                newUserQuestion: message,
            });

            for await (const chunk of stream) {
                finalResponse += chunk;
                setStreamingResponse(finalResponse);
            }

        } catch (e) {
            console.error(e);
            finalResponse = "Произошла ошибка при обработке вашего запроса.";
            setStreamingResponse(finalResponse);
        } finally {
            if (finalResponse) {
                const newModelMessage: ChatMessage = { role: 'model', text: finalResponse };
                onChatUpdate([...currentHistory, newModelMessage]);
            }
            setIsThinking(false);
            setStreamingResponse(null);
        }
    };
    
    const handleCopy = () => {
        const textToCopy = chatHistory.map(m => `${m.role === 'user' ? 'Вы' : 'Ассистент'}: ${m.text}`).join('\n\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handleDownload = () => {
        const textToSave = chatHistory.map(msg => `${msg.role === 'user' ? 'Пользователь' : 'AI-Аналитик'}:\n${msg.text}\n`).join('\n---\n');
        const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `overall-analysis-chat-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div
            className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                            Общий AI-анализ
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Анализ {kpis.slice(0, 2).map(k=>k.title).join(', ')}{kpis.length > 2 ? ' и др.' : ''} за {period}
                        </p>
                    </div>
                    <button onClick={onClose} title="Закрыть" className="text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors p-1 rounded-full">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-grow p-4 overflow-y-auto" ref={chatContainerRef} style={{ scrollBehavior: 'smooth' }}>
                     {isLoading && (
                        <div className="flex flex-col justify-center items-center h-full text-center">
                            <Loader />
                            <p className="mt-4 text-gray-600 dark:text-gray-400">Анализирую данные...<br/>Это может занять некоторое время.</p>
                        </div>
                    )}
                    {error && !isLoading && (
                        <div className="text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300 p-4 rounded-lg text-center">{error}</div>
                    )}
                    
                    <div className="space-y-4 pt-2">
                        {chatHistory.map((msg, index) => (
                             <div key={index} className={`group flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'model' && (
                                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                                        <BotIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    </div>
                                )}
                               <div className={`prose prose-sm max-w-md p-3 rounded-2xl dark:text-gray-200 ${msg.role === 'user' ? 'bg-cyan-500 text-white rounded-br-lg' : 'bg-gray-100 dark:bg-gray-800 rounded-bl-lg'}`}>
                                    <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
                               </div>
                            </div>
                        ))}
                         {isThinking && streamingResponse !== null && (
                            <div className="flex items-end gap-2.5 justify-start">
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                                    <BotIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </div>
                                <div className="prose prose-sm max-w-md p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 dark:text-gray-200 rounded-bl-lg">
                                    <div dangerouslySetInnerHTML={{ __html: streamingResponse.replace(/\n/g, '<br />') }} />
                                    <span className="inline-block w-2 h-4 bg-gray-600 dark:bg-gray-400 animate-pulse ml-1 align-middle"></span>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
                    {!isLoading && !error && chatHistory.length < 2 && (
                        <div className="flex flex-wrap gap-2 mb-3 justify-center">
                            {quickQuestions.map(q => (
                                <button key={q} onClick={() => handleSendMessage(q)} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}
                     <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 flex items-center gap-2">
                             <button onClick={handleCopy} disabled={isThinking || chatHistory.length === 0} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 text-sm disabled:opacity-50">
                                {isCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                                <span className="hidden sm:inline">Копировать</span>
                            </button>
                            <button onClick={handleDownload} disabled={isThinking || chatHistory.length === 0} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 text-sm disabled:opacity-50">
                                <DownloadIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Скачать</span>
                            </button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }} className="flex-grow flex items-center gap-2">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Задайте уточняющий вопрос..."
                                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                                disabled={isThinking || isLoading || !!error}
                            />
                            <button type="submit" disabled={!userInput.trim() || isThinking || isLoading || !!error} className="p-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                                <SendIcon className="w-5 h-5"/>
                            </button>
                        </form>
                     </div>
                </footer>
            </div>
        </div>
    );
};