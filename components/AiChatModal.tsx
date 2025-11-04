import React, { useState, useEffect, useRef } from 'react';
import type { Kpi, ChatMessage } from '../App';
import type { AnalysisData } from './KpiCard';
import { Loader } from './Loader';
import { generateChatResponseStream } from '../services/geminiService';
import { ReportGenerator } from './ReportGenerator';
import { 
    SparklesIcon, LightbulbIcon, XIcon, SendIcon, ClipboardIcon, 
    CheckIcon, BotIcon, Trash2Icon, StopCircleIcon 
} from './icons';

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpi: Kpi;
  initialAnalysisData: AnalysisData | null;
  isLoading: boolean;
  error: string | null;
  chatHistory: ChatMessage[];
  onChatUpdate: (newHistory: ChatMessage[]) => void;
}

const quickQuestions = [
    "Почему снизился показатель?",
    "Как улучшить KPI?",
    "Покажи прогноз на следующий месяц",
];

const Chart: React.FC<{ data: number[], trend: number[], forecast: number[] }> = ({ data, trend, forecast }) => {
    const allValues = [...data, ...forecast];
    const maxVal = Math.max(...allValues);
    const minVal = Math.min(...allValues);
    const range = maxVal > minVal ? maxVal - minVal : 1;

    const scaleY = (val: number) => 40 - ((val - minVal) / range) * 35;
    const totalPoints = data.length + forecast.length;

    const dataPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${(i / (totalPoints - 1)) * 100},${scaleY(d)}`).join(' ');
    const trendPath = trend.map((d, i) => `${i === 0 ? 'M' : 'L'} ${(i / (data.length - 1)) * (data.length / totalPoints * 100)},${scaleY(d)}`).join(' ');
    const forecastPath = forecast.map((d, i) => `${i === 0 ? 'M' : 'L'} ${((i + data.length - 1) / (totalPoints - 1)) * 100},${scaleY(d)}`).join(' ');
    
    return (
        <svg className="w-full h-full p-2" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d={dataPath} fill="none" stroke="rgba(59, 130, 246, 0.6)" strokeWidth="1"/>
            <path d={trendPath} fill="none" stroke="rgba(234, 179, 8, 0.7)" strokeWidth="0.7" strokeDasharray="2,2"/>
            <path d={`M ${((data.length -1) / (totalPoints-1)) * 100},${scaleY(data[data.length-1])} ${forecastPath.substring(1)}`} fill="none" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="1" strokeDasharray="3,3"/>
        </svg>
    )
};

export const AiChatModal: React.FC<AiChatModalProps> = ({ isOpen, onClose, kpi, initialAnalysisData, isLoading, error, chatHistory, onChatUpdate }) => {
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
        if(isOpen) {
            setUserInput("");
            setIsCopied(false);
            setIsThinking(false);
            stopGenerationRef.current = true; // Stop any pending generation on open/close
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSendMessage = async (message: string) => {
        if (!message.trim() || isThinking || !initialAnalysisData) return;

        stopGenerationRef.current = false;
        const newUserMessage: ChatMessage = { role: 'user', text: message };
        const historyForApi = [...chatHistory];
        
        onChatUpdate([...historyForApi, newUserMessage]);
        
        setUserInput("");
        setIsThinking(true);
        setStreamingResponse("");

        let finalResponse = "";
        try {
            const stream = generateChatResponseStream({
                kpi,
                initialAnalysis: initialAnalysisData,
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
                onChatUpdate([...historyForApi, newUserMessage, newModelMessage]);
            }
            setIsThinking(false);
            setStreamingResponse(null);
        }
    };
    
    const handleStopGeneration = () => {
        stopGenerationRef.current = true;
    };
    
    const handleDeleteMessage = (indexToDelete: number) => {
        const newHistory = chatHistory.filter((_, index) => index !== indexToDelete);
        onChatUpdate(newHistory);
    };

    const handleClearChat = () => {
        if(window.confirm("Вы уверены, что хотите очистить историю этого диалога?")) {
            onChatUpdate([]);
        }
    };

    const handleCopy = () => {
        if (!initialAnalysisData) return;
        const initialText = `Анализ по KPI: ${kpi.title}\n\nОценка: ${initialAnalysisData.geminiText.summary}\nРекомендации: ${initialAnalysisData.geminiText.recommendations}`;
        const chatText = chatHistory.map(m => `${m.role === 'user' ? 'Вы' : 'Ассистент'}: ${m.text}`).join('\n\n');
        const fullText = chatText.length > 0 ? `${initialText}\n\n--- Диалог ---\n${chatText}` : initialText;
        navigator.clipboard.writeText(fullText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div 
            className={`fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
            onClick={onClose}
        >
            <div 
                className={`bg-white text-gray-800 rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] max-h-[800px] flex flex-col transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <BotIcon className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
                            <p className="text-sm text-gray-500">Анализ: {kpi.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {chatHistory.length > 0 && (
                             <button onClick={handleClearChat} title="Очистить диалог" className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full">
                                <Trash2Icon className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} title="Закрыть" className="text-gray-400 hover:text-gray-800 transition-colors p-1 rounded-full">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>
                
                <div className="flex-grow p-4 overflow-y-auto" ref={chatContainerRef} style={{scrollBehavior: 'smooth'}}>
                    {isLoading && (
                        <div className="flex justify-center items-center h-full"><Loader /></div>
                    )}
                    {error && (
                        <div className="text-red-500 bg-red-50 p-3 rounded-lg text-center">{error}</div>
                    )}
                    {initialAnalysisData && (
                        <div className="mb-4 space-y-4 pb-4 border-b border-gray-200">
                             <div className="bg-gray-50 rounded-lg p-1 border border-gray-200">
                                <div className="w-full h-40">
                                    <Chart data={initialAnalysisData.analysisResult.data} trend={initialAnalysisData.analysisResult.trend.line} forecast={initialAnalysisData.analysisResult.forecast.values} />
                                </div>
                             </div>
                             <div>
                                <h4 className="font-semibold text-gray-800 mb-1 flex items-center gap-2 text-sm"><SparklesIcon className="w-4 h-4 text-cyan-500" /> Общая оценка</h4>
                                <p className="text-gray-600 text-sm">{initialAnalysisData.geminiText.summary}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-1 flex items-center gap-2 text-sm"><LightbulbIcon className="w-4 h-4 text-cyan-500" /> Рекомендации</h4>
                                <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                                    {initialAnalysisData.geminiText.recommendations.split('\n').map((rec, i) => {
                                        const cleanRec = rec.trim().replace(/^- \*\*(.*?)\*\*:/, '$1:').replace(/^- /, '');
                                        return cleanRec && <li key={i}>{cleanRec}</li>;
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-4 pt-2">
                        {chatHistory.map((msg, index) => (
                             <div key={index} className={`group flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'user' && (
                                     <button onClick={() => handleDeleteMessage(index)} className="opacity-0 group-hover:opacity-50 text-gray-400 hover:text-red-500 transition-opacity mb-2">
                                        <Trash2Icon className="w-4 h-4" />
                                     </button>
                                )}
                                {msg.role === 'model' && (
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <BotIcon className="w-5 h-5 text-gray-500" />
                                    </div>
                                )}
                               <div className={`max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-500 text-white rounded-br-lg' : 'bg-gray-100 text-gray-800 rounded-bl-lg'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                               </div>
                               {msg.role === 'model' && (
                                     <button onClick={() => handleDeleteMessage(index)} className="opacity-0 group-hover:opacity-50 text-gray-400 hover:text-red-500 transition-opacity mb-2">
                                        <Trash2Icon className="w-4 h-4" />
                                     </button>
                                )}
                            </div>
                        ))}
                         {isThinking && streamingResponse !== null && (
                            <div className="flex items-end gap-2.5 justify-start">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <BotIcon className="w-5 h-5 text-gray-500" />
                                </div>
                                <div className="max-w-md p-3 rounded-2xl bg-gray-100 text-gray-800 rounded-bl-lg">
                                    <p className="text-sm whitespace-pre-wrap">
                                        {streamingResponse}
                                        <span className="inline-block w-2 h-4 bg-gray-600 animate-pulse ml-1 align-middle"></span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
                    {initialAnalysisData && chatHistory.length === 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 justify-center">
                            {quickQuestions.map(q => (
                                <button key={q} onClick={() => handleSendMessage(q)} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200 transition-colors">
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}
                     <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }} className="flex items-center gap-3">
                        <div className="flex-grow flex items-center gap-2">
                             {initialAnalysisData && <ReportGenerator kpi={kpi} analysisData={initialAnalysisData} chatHistory={chatHistory} />}
                             <button type="button" onClick={handleCopy} className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 font-semibold rounded-md hover:bg-gray-200 transition-all duration-300 text-sm disabled:opacity-50" disabled={isThinking}>
                                {isCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                                <span className="hidden sm:inline">{isCopied ? "Скопировано!" : "Копировать"}</span>
                            </button>
                        </div>
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Задайте уточняющий вопрос..."
                            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                            disabled={isThinking || !initialAnalysisData}
                        />
                         {isThinking ? (
                            <button type="button" onClick={handleStopGeneration} title="Остановить генерацию" className="p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex-shrink-0">
                                <StopCircleIcon className="w-5 h-5"/>
                            </button>
                        ) : (
                            <button type="submit" disabled={!userInput.trim()} className="p-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                                <SendIcon className="w-5 h-5"/>
                            </button>
                        )}
                    </form>
                </footer>
            </div>
        </div>
    );
};
