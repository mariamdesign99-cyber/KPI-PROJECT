import React, { useState, useEffect, useRef } from 'react';
import type { Kpi, ChatMessage } from '../App';
import { Loader } from './Loader';
import { generateCorrelationChatResponseStream } from '../services/geminiService';
import { 
    SparklesIcon, XIcon, SendIcon, ClipboardIcon, 
    CheckIcon, BotIcon, DownloadIcon, StopCircleIcon 
} from './icons';

interface CorrelationChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpi1: Kpi;
  kpi2: Kpi;
  correlation: number;
  initialAnalysis: string;
  chatHistory: ChatMessage[];
  onChatUpdate: (newHistory: ChatMessage[]) => void;
}

const quickQuestions = [
    "Объясни эту связь подробнее",
    "Какие факторы могут влиять на эту корреляцию?",
    "Что это означает для бизнеса?",
];

export const CorrelationChatModal: React.FC<CorrelationChatModalProps> = ({ isOpen, onClose, kpi1, kpi2, correlation, initialAnalysis, chatHistory, onChatUpdate }) => {
    const [userInput, setUserInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [streamingResponse, setStreamingResponse] = useState<string | null>(null);
    const stopGenerationRef = useRef(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, streamingResponse]);
    
     useEffect(() => {
        if (isOpen && chatHistory.length === 0) {
            onChatUpdate([{ role: 'model', text: initialAnalysis }]);
        }
        if(!isOpen) {
             stopGenerationRef.current = true;
        }
    }, [isOpen, initialAnalysis, chatHistory.length, onChatUpdate]);


    if (!isOpen) return null;

    const handleSendMessage = async (message: string) => {
        if (!message.trim() || isThinking) return;

        stopGenerationRef.current = false;
        const newUserMessage: ChatMessage = { role: 'user', text: message };
        const historyForApi = [...chatHistory, newUserMessage];
        
        onChatUpdate(historyForApi);
        
        setUserInput("");
        setIsThinking(true);
        setStreamingResponse("");

        let finalResponse = "";
        try {
            const stream = generateCorrelationChatResponseStream({
                kpi1,
                kpi2,
                correlation,
                initialAnalysis,
                chatHistory: historyForApi,
                newUserQuestion: message,
            });

            for await (const chunk of stream) {
                if (stopGenerationRef.current) break;
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
                onChatUpdate([...historyForApi, newModelMessage]);
            }
            setIsThinking(false);
            setStreamingResponse(null);
        }
    };
    
    const handleStopGeneration = () => {
        stopGenerationRef.current = true;
    };

    const handleCopy = () => {
        const chatText = chatHistory.map(m => `${m.role === 'user' ? 'Вы' : 'Ассистент'}: ${m.text}`).join('\n\n');
        navigator.clipboard.writeText(chatText).then(() => {
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
        a.download = `correlation-analysis-${kpi1.id}-vs-${kpi2.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div 
            className={`fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
            onClick={onClose}
        >
            <div 
                className={`bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] max-h-[800px] flex flex-col transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <BotIcon className="w-6 h-6 text-gray-600 dark:text-gray-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI-Анализ Корреляции</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{kpi1.title} vs {kpi2.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} title="Закрыть" className="text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors p-1 rounded-full">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <div className="flex-grow p-4 overflow-y-auto" ref={chatContainerRef} style={{scrollBehavior: 'smooth'}}>
                    <div className="space-y-4 pt-2">
                        {chatHistory.map((msg, index) => (
                             <div key={index} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'model' && (
                                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                                        <BotIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    </div>
                                )}
                               <div className={`max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-500 text-white rounded-br-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-lg'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                               </div>
                            </div>
                        ))}
                         {isThinking && streamingResponse !== null && (
                            <div className="flex items-end gap-2.5 justify-start">
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                                    <BotIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </div>
                                <div className="max-w-md p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-lg">
                                    <p className="text-sm whitespace-pre-wrap">
                                        {streamingResponse}
                                        <span className="inline-block w-2 h-4 bg-gray-600 dark:bg-gray-400 animate-pulse ml-1 align-middle"></span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
                    {chatHistory.length <= 1 && (
                        <div className="flex flex-wrap gap-2 mb-3 justify-center">
                            {quickQuestions.map(q => (
                                <button key={q} onClick={() => handleSendMessage(q)} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}
                     <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }} className="flex items-center gap-3">
                        <div className="flex-shrink-0 flex items-center gap-2">
                             <button onClick={handleCopy} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 text-sm">
                                {isCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                                <span className="hidden sm:inline">Копировать</span>
                            </button>
                            <button onClick={handleDownload} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 text-sm">
                                <DownloadIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Скачать</span>
                            </button>
                        </div>
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Задайте уточняющий вопрос..."
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                            disabled={isThinking}
                        />
                         {isThinking ? (
                            <button type="button" onClick={handleStopGeneration} title="Остановить генерацию" className="p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex-shrink-0">
                                <StopCircleIcon className="w-5 h-5"/>
                            </button>
                        ) : (
                            <button type="submit" disabled={!userInput.trim()} className="p-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                                <SendIcon className="w-5 h-5"/>
                            </button>
                        )}
                    </form>
                </footer>
            </div>
        </div>
    );
};
