import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    DatabaseIcon, FileUpIcon, TypeIcon, ClockIcon, XIcon, CheckCircle2Icon, XCircleIcon, HistoryIcon 
} from './icons';

type DataSource = 'api' | 'file' | 'manual';
type Schedule = 'hourly' | 'daily' | 'manual';
type UploadStatus = 'idle' | 'success' | 'error';
type ModalView = 'select' | 'preview' | 'processing' | 'result' | 'log';

interface ImportLogEntry {
    date: Date;
    fileName: string;
    status: 'success' | 'error';
    newRecords?: number;
    updatedRecords?: number;
}

interface DataUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: { source: DataSource; schedule?: Schedule, manualData?: Record<string, string> }) => void;
}

const EXPECTED_HEADERS = ['id', 'date', 'value', 'kpi_name'];

export const DataUpdateModal: React.FC<DataUpdateModalProps> = ({ isOpen, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState<DataSource>('file');
    const [schedule, setSchedule] = useState<Schedule>('daily');
    const [isDragging, setIsDragging] = useState(false);
    const [manualInput, setManualInput] = useState('revenue: 1.3M ₽\nsales: 9,102');

    // State for file handling and views
    const [view, setView] = useState<ModalView>('select');
    const [previewData, setPreviewData] = useState<{ headers: string[], rows: string[][] } | null>(null);
    const [validationErrors, setValidationErrors] = useState<{ missingHeaders: string[], invalidCells: { row: number, colIndex: number }[] } | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [processedFileData, setProcessedFileData] = useState<Record<string, string> | null>(null);
    
    // State for upload process
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);
    const [lastImportResult, setLastImportResult] = useState<{ newRecords: number, updatedRecords: number } | null>(null);

    const progressIntervalRef = useRef<number | null>(null);

    // Effect to clean up interval on unmount or when processing finishes
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    const resetStateAndClose = useCallback(() => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setActiveTab('file');
        setSchedule('daily');
        setIsDragging(false);
        setManualInput('revenue: 1.3M ₽\nsales: 9,102');
        setView('select');
        setPreviewData(null);
        setValidationErrors(null);
        setFileName(null);
        setProcessedFileData(null);
        setUploadProgress(0);
        setUploadStatus('idle');
        setLastImportResult(null);
        onClose();
    }, [onClose]);

    const handleConfirmImport = () => {
        if (!fileName || !processedFileData || (validationErrors && validationErrors.missingHeaders.length > 0)) return;

        setView('processing');
        setUploadProgress(0);

        progressIntervalRef.current = window.setInterval(() => {
            setUploadProgress(prev => {
                const newProgress = prev + Math.random() * 10;
                if (newProgress >= 95) {
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                    return 95;
                }
                return newProgress;
            });
        }, 200);

        setTimeout(() => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setUploadProgress(100);

            const isSuccess = Math.random() > 0.2;
            const newRecords = Math.floor(Math.random() * 50) + 10;
            const updatedRecords = Math.floor(Math.random() * 20) + 5;
            
            const logEntry: ImportLogEntry = {
                date: new Date(),
                fileName,
                status: isSuccess ? 'success' : 'error',
                ...(isSuccess && { newRecords, updatedRecords })
            };
            setImportLog(prev => [logEntry, ...prev].slice(0, 10));

            if (isSuccess && processedFileData) {
                setUploadStatus('success');
                setLastImportResult({ newRecords, updatedRecords });
                onSave({ source: 'file', manualData: processedFileData });
            } else {
                setUploadStatus('error');
                setLastImportResult(null);
            }

            setView('result');
        }, 2500);
    };

    const handleGeneralSave = () => {
        let manualData: Record<string, string> | undefined;
        if (activeTab === 'manual' && manualInput) {
            manualData = {};
            manualInput.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':');
                if (key && value) {
                    manualData![key.trim()] = value.trim();
                }
            });
        }
        onSave({ source: activeTab, schedule: activeTab === 'api' ? schedule : undefined, manualData });
        resetStateAndClose();
    };

    const validateData = (headers: string[], rows: string[][]) => {
        const lowerCaseHeaders = headers.map(h => h.toLowerCase().trim());
        const missingHeaders = EXPECTED_HEADERS.filter(h => !lowerCaseHeaders.includes(h));
        const invalidCells: { row: number, colIndex: number }[] = [];
        rows.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (!cell || cell.trim() === '') invalidCells.push({ row: rowIndex, colIndex });
            });
        });
        return { missingHeaders, invalidCells };
    };

    const processFile = (file: File) => {
        setFileName(file.name);
        // This is a mock processing. In a real app, you'd use a library like PapaParse or SheetJS.
        const mockCsvContent = `kpi_name, date, value, id\nrevenue,2024-07-30,1350000,1\nsales,2024-07-30,8900,2\nnew_clients,2024-07-30,,3\nconversion,2024-07-29,5.1,4\nemployee_turnover,2024-07-29,3.1,5\nticket_resolution_time,2024-07-28,4.5,6\nnew_clients,2024-07-28,1210,7\nsales,2024-07-28,8450,8\nrevenue,2024-07-28,1190000,9\nrevenue,2024-07-27,1185000,10`;
        const lines = mockCsvContent.trim().split('\n');
        const headers = lines.shift()!.split(',').map(h => h.trim());
        const allRows = lines.map(line => line.split(',').map(c => c.trim()));
        const previewRows = allRows.slice(0, 10);

        setPreviewData({ headers, rows: previewRows });
        setValidationErrors(validateData(headers, previewRows));
        
        const dataForUpdate: Record<string, string> = {};
        const kpiNameIndex = headers.findIndex(h => h.toLowerCase().trim() === 'kpi_name');
        const valueIndex = headers.findIndex(h => h.toLowerCase().trim() === 'value');

        if (kpiNameIndex !== -1 && valueIndex !== -1) {
             allRows.forEach(row => {
                if (row[kpiNameIndex] && row[valueIndex]) {
                    dataForUpdate[row[kpiNameIndex]] = row[valueIndex];
                }
            });
        }
        setProcessedFileData(dataForUpdate);
        setView('preview');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) processFile(e.target.files[0]);
    };

    const handleDragEvents = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
        else if (e.type === "dragleave") setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        handleDragEvents(e);
        if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
    };

    const handleCancelPreview = () => {
        setView('select');
        setPreviewData(null);
        setValidationErrors(null);
        setFileName(null);
        setProcessedFileData(null);
    };

    const renderFileContent = () => {
        switch (view) {
            case 'select':
                return (
                    <div
                        onDragEnter={handleDragEvents} onDragLeave={handleDragEvents} onDragOver={handleDragEvents} onDrop={handleDrop}
                        className={`flex flex-col items-center justify-center h-full p-8 border-2 border-dashed rounded-lg transition-colors ${isDragging ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                        <FileUpIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Перетащите файл сюда</p>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">или</p>
                        <label htmlFor="file-upload" className="cursor-pointer px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors">
                            Выберите файл
                        </label>
                        <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">Поддерживаемые форматы: CSV, XLSX</p>
                    </div>
                );
            case 'preview':
                return (
                    <div className="flex flex-col h-full animate-fade-in">
                        <h3 className="text-lg font-bold mb-2">Предпросмотр: <span className="font-medium text-cyan-600">{fileName}</span></h3>
                        {validationErrors?.missingHeaders && validationErrors.missingHeaders.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm mb-4">
                                <p className="font-semibold">Критическая ошибка: Отсутствуют обязательные колонки:</p>
                                <ul className="list-disc list-inside ml-2">
                                    {validationErrors.missingHeaders.map(h => <li key={h}><code>{h}</code></li>)}
                                </ul>
                            </div>
                        )}
                         {validationErrors?.invalidCells && validationErrors.invalidCells.length > 0 && validationErrors.missingHeaders.length === 0 && (
                             <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-3 rounded-lg text-sm mb-4">
                                <p className="font-semibold">Обнаружены пустые ячейки. Они будут проигнорированы при импорте.</p>
                            </div>
                        )}
                        <div className="flex-grow overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                                    <tr>
                                        {previewData?.headers.map((header, index) => (
                                            <th key={index} className="p-2 text-left font-semibold border-b border-gray-200 dark:border-gray-700">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData?.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="even:bg-gray-50 dark:even:bg-gray-800/50">
                                            {row.map((cell, colIndex) => {
                                                const isInvalid = validationErrors?.invalidCells.some(err => err.row === rowIndex && err.colIndex === colIndex);
                                                return (
                                                    <td key={colIndex} className={`p-2 border-b border-gray-200 dark:border-gray-700 ${isInvalid ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}>
                                                        {cell}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <footer className="mt-4 flex justify-end gap-4">
                            <button onClick={handleCancelPreview} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Отменить</button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={!!validationErrors?.missingHeaders.length}
                                className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                Подтвердить и импортировать
                            </button>
                        </footer>
                    </div>
                );
            case 'processing':
                return (
                    <div className="flex flex-col items-center justify-center h-full animate-fade-in text-center">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Обработка файла: {fileName}</p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%`, transition: 'width 0.3s ease-in-out' }}></div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{Math.round(uploadProgress)}%</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Пожалуйста, подождите, это может занять несколько секунд...</p>
                    </div>
                );
            case 'result':
                return (
                     <div className="flex flex-col items-center justify-center h-full animate-fade-in text-center">
                        {uploadStatus === 'success' ? (
                            <>
                                <CheckCircle2Icon className="w-16 h-16 text-green-500 mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Импорт завершён</h3>
                                <p className="text-gray-600 dark:text-gray-300 mt-2">
                                    Файл <span className="font-semibold">{fileName}</span> успешно обработан. <br />
                                    Добавлено {lastImportResult?.newRecords} новых записей, обновлено {lastImportResult?.updatedRecords}.
                                </p>
                            </>
                        ) : (
                            <>
                                <XCircleIcon className="w-16 h-16 text-red-500 mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ошибка загрузки</h3>
                                <p className="text-gray-600 dark:text-gray-300 mt-2">
                                    Не удалось обработать файл <span className="font-semibold">{fileName}</span>. <br />
                                    Проверьте формат данных и попробуйте снова.
                                </p>
                            </>
                        )}
                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={() => setView('log')}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                <HistoryIcon className="w-5 h-5" />
                                Просмотреть журнал
                            </button>
                            <button
                                onClick={handleCancelPreview}
                                className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors"
                            >
                                Загрузить другой файл
                            </button>
                        </div>
                    </div>
                );
            case 'log':
                return (
                     <div className="flex flex-col h-full animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Журнал импорта</h3>
                            <button onClick={() => setView('result')} className="text-sm text-cyan-600 hover:underline">Назад</button>
                        </div>
                        <div className="flex-grow space-y-2 overflow-y-auto pr-2">
                            {importLog.length > 0 ? importLog.map((entry, index) => (
                                <div key={index} className={`p-3 rounded-lg flex justify-between items-start ${entry.status === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                    <div>
                                        <p className="font-semibold text-sm truncate max-w-[200px] sm:max-w-xs">{entry.fileName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{entry.date.toLocaleString('ru-RU')}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        {entry.status === 'success' ? (
                                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-semibold">
                                                <CheckCircle2Icon className="w-4 h-4" /> Успешно
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-semibold">
                                                <XCircleIcon className="w-4 h-4" /> Ошибка
                                            </div>
                                        )}
                                        {entry.status === 'success' && (
                                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                                +{entry.newRecords} / ~{entry.updatedRecords}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-gray-500 py-8">Журнал пуст.</p>
                            )}
                        </div>
                        {importLog.length > 0 && (
                            <button onClick={() => { if (window.confirm('Вы уверены, что хотите очистить журнал?')) setImportLog([]) }} className="mt-4 text-sm text-red-500 hover:underline self-center">Очистить журнал</button>
                        )}
                    </div>
                );
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={resetStateAndClose}>
            <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl shadow-2xl w-full max-w-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold">Настройки обновления данных</h2>
                    <button onClick={resetStateAndClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><XIcon className="w-5 h-5"/></button>
                </header>

                <main className="p-6">
                    <div className="flex mb-6 border-b border-gray-200 dark:border-gray-700">
                        {[
                            { id: 'file', label: 'Файл', icon: <FileUpIcon/> },
                            { id: 'api', label: 'API', icon: <DatabaseIcon/> },
                            { id: 'manual', label: 'Вручную', icon: <TypeIcon/> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as DataSource)}
                                disabled={view !== 'select'}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors disabled:opacity-50 ${activeTab === tab.id ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                            >
                                {React.cloneElement(tab.icon, { className: 'w-5 h-5' })} {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[300px]">
                        {activeTab === 'api' && (
                            <div className="space-y-4 animate-fade-in">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Настройте автоматическую синхронизацию данных с вашим источником через API.</p>
                                <div>
                                    <label htmlFor="api-endpoint" className="block text-sm font-medium mb-1">API Endpoint</label>
                                    <input type="text" id="api-endpoint" placeholder="https://api.example.com/kpi-data" className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 flex items-center gap-2"><ClockIcon className="w-4 h-4"/>Частота обновления</label>
                                    <div className="flex gap-2">
                                        {[{id: 'hourly', label: 'Каждый час'}, {id: 'daily', label: 'Раз в день'}, {id: 'manual', label: 'Вручную'}].map(s => (
                                            <button key={s.id} onClick={() => setSchedule(s.id as Schedule)} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${schedule === s.id ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{s.label}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'file' && renderFileContent()}

                        {activeTab === 'manual' && (
                            <div className="space-y-4 animate-fade-in">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Введите данные вручную. Каждую пару "ключ: значение" пишите с новой строки.<br/>Ключ должен соответствовать ID показателя (например, 'revenue').</p>
                                <textarea
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    rows={6}
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono"
                                    placeholder="revenue: 1.25M ₽&#10;sales: 8,500"
                                />
                            </div>
                        )}
                    </div>
                </main>
                
                {activeTab !== 'file' && (
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
                        <button onClick={resetStateAndClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Отмена</button>
                        <button onClick={handleGeneralSave} className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors">Сохранить</button>
                    </footer>
                )}
            </div>
        </div>
    );
};
