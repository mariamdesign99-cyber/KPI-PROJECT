import React, { useState, useEffect, useRef } from 'react';
import { BotIcon, XIcon, SendIcon, ClipboardIcon, CheckIcon, DownloadIcon } from './icons';
import { generateAssistantResponseStream, AssistantContext } from '../services/geminiService';
import { ChatMessage } from '../App';


const predefinedQuestions = [
    "Как улучшить мои показатели?",
    "Какие уведомления самые важные?",
    "Проанализируй мою активность за неделю",
];

interface AiAssistantChatProps {
    context: AssistantContext;
}

export const AiAssistantChat: React.FC<AiAssistantChatProps> = ({ context }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: `Здравствуйте, ${context.user.firstName}! Чем могу помочь?` }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages, isTyping]);

    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim() || isTyping) return;

        const newUserMessage: ChatMessage = { role: 'user', text: messageText };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setUserInput('');
        setIsTyping(true);

        try {
            // Add a placeholder for the model's response
            setMessages(prev => [...prev, { role: 'model', text: '' }]);
            
            const stream = generateAssistantResponseStream(updatedMessages, context);
            let responseText = '';

            for await (const chunk of stream) {
                responseText += chunk;
                setMessages(prev => {
                    const lastMsgIndex = prev.length - 1;
                    const updated = [...prev];
                    updated[lastMsgIndex] = { ...updated[lastMsgIndex], text: responseText };
                    return updated;
                });
            }
        } catch (error) {
            console.error("AI Assistant stream error:", error);
            const errorMessage: ChatMessage = { role: 'model', text: "Извините, произошла ошибка. Попробуйте позже." };
            // Replace the placeholder with the error message
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedMessageIndex(index);
            setTimeout(() => setCopiedMessageIndex(null), 2000);
        });
    };
    
    const handleDownload = (text: string) => {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ai-assistant-response.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Window */}
            <div className={`
                absolute bottom-full right-0 mb-4 w-96 h-[60vh] max-h-[500px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col
                transition-all duration-300 ease-in-out
                ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
            `}>
                <header className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BotIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        AI-Советник
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>

                <main className="flex-grow p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'items-end'}`}>
                            {msg.role === 'model' && <div className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0"><BotIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /></div>}
                            <div className={`group relative max-w-xs p-3 rounded-lg ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                {msg.role === 'model' && msg.text && (
                                    <div className="absolute top-full right-0 mt-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleCopy(msg.text, index)} title="Копировать" className="p-1 bg-gray-200 dark:bg-gray-600 rounded text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500">
                                            {copiedMessageIndex === index ? <CheckIcon className="w-3 h-3 text-green-500" /> : <ClipboardIcon className="w-3 h-3" />}
                                        </button>
                                        <button onClick={() => handleDownload(msg.text)} title="Скачать .txt" className="p-1 bg-gray-200 dark:bg-gray-600 rounded text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500">
                                            <DownloadIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex items-end gap-2.5">
                            <div className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0"><BotIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /></div>
                            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg rounded-bl-none">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></span>
                                    <span className="w-2 h-2 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                                    <span className="w-2 h-2 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>

                <footer className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    {messages.length <= 3 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {predefinedQuestions.map(q => (
                                <button key={q} onClick={() => handleSendMessage(q)} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-md transition-colors">
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Задайте свой вопрос..."
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-white placeholder-gray-500 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                            disabled={isTyping}
                        />
                        <button type="submit" disabled={!userInput.trim() || isTyping} className="p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </form>
                </footer>
            </div>

            {/* Floating Action Button */}
            <button
                id="tour-step-7-assistant-fab"
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 bg-cyan-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-cyan-500 transition-transform transform hover:scale-105"
                aria-label="Открыть AI-Советник"
            >
                <BotIcon className="w-8 h-8" />
            </button>
        </div>
    );
};