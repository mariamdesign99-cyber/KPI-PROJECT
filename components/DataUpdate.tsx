import React, { useState } from 'react';
import { UploadCloudIcon, RefreshCwIcon, CheckCircle2Icon, XCircleIcon } from './icons';
import { Loader } from './Loader';
import { DataUpdateModal } from './DataUpdateModal';

type UpdateStatus = 'idle' | 'success' | 'error';

interface LastUpdate {
    date: Date;
    newRecords: number;
    status: UpdateStatus;
}

interface DataUpdateProps {
    onDataUpdated: (manualUpdates?: Record<string, string>) => void;
}

export const DataUpdate: React.FC<DataUpdateProps> = ({ onDataUpdated }) => {
    const [lastUpdate, setLastUpdate] = useState<LastUpdate | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const performUpdate = async (manualData?: Record<string, string>) => {
        setIsLoading(true);
        // Simulate API call/file processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        const isSuccess = Math.random() > 0.2; // 80% chance of success
        if (isSuccess && onDataUpdated) {
            onDataUpdated(manualData);
        }
        
        setLastUpdate({
            date: new Date(),
            newRecords: Math.floor(Math.random() * 500) + 50,
            status: isSuccess ? 'success' : 'error',
        });
        setIsLoading(false);
    };

    const handleModalSave = (settings: { source: string; schedule?: string; manualData?: Record<string, string> }) => {
        setIsModalOpen(false);
        performUpdate(settings.manualData);
    };

    const getStatusStyles = () => {
        if (!lastUpdate || lastUpdate.status === 'idle') {
            return {
                bgColor: 'bg-gray-100 dark:bg-gray-800/50',
                textColor: 'text-gray-500 dark:text-gray-400',
                icon: null
            };
        }
        if (lastUpdate.status === 'success') {
            return {
                bgColor: 'bg-green-100 dark:bg-green-900/50',
                textColor: 'text-green-700 dark:text-green-300',
                icon: <CheckCircle2Icon className="w-5 h-5" />
            };
        }
        return { // error
            bgColor: 'bg-red-100 dark:bg-red-900/50',
            textColor: 'text-red-700 dark:text-red-300',
            icon: <XCircleIcon className="w-5 h-5" />
        };
    };

    const { bgColor, textColor, icon } = getStatusStyles();

    return (
        <>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg h-full flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Обновление данных</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-cyan-700 dark:text-cyan-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-wait"
                        >
                            <UploadCloudIcon className="w-5 h-5" />
                            <span>Загрузить файл (Excel/CSV)</span>
                        </button>
                        <button 
                            onClick={() => performUpdate()}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-cyan-700 dark:text-cyan-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-wait"
                        >
                            <RefreshCwIcon className="w-5 h-5" />
                            <span>Синхронизировать (API)</span>
                        </button>
                    </div>
                </div>
                
                <div key={lastUpdate?.date.toISOString()} className={`p-3 rounded-lg transition-colors duration-500 ${bgColor} ${lastUpdate ? 'animate-fade-in' : ''}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isLoading ? <Loader small /> : icon}
                            <div>
                                <p className={`font-semibold text-sm ${textColor}`}>
                                    {isLoading ? 'Идет обновление...' : (lastUpdate ? `Последнее обновление` : 'Нет данных об обновлениях')}
                                </p>
                                {lastUpdate && !isLoading && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {lastUpdate.date.toLocaleString('ru-RU')}
                                    </p>
                                )}
                            </div>
                        </div>
                        {lastUpdate && !isLoading && (
                             <div className="text-right">
                                 <p className={`font-bold text-lg ${textColor}`}>
                                    {lastUpdate.status === 'success' ? `+${lastUpdate.newRecords}` : 'Ошибка'}
                                 </p>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {lastUpdate.status === 'success' ? 'новых записей' : 'не удалось'}
                                 </p>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            <DataUpdateModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleModalSave}
            />
        </>
    );
};