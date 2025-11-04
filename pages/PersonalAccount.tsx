import React, { useState, useRef } from 'react';
import { 
    UserCircleIcon, EditIcon, SaveIcon, UploadCloudIcon,
    TrendingUpIcon, TrendingDownIcon, HistoryIcon, BellIcon, Trash2Icon,
    PaletteIcon, LanguagesIcon, KeyRoundIcon, BrainCircuitIcon,
    CheckCircle2Icon, SunIcon, MoonIcon, ArrowRightIcon
} from '../components/icons';
import { AiAssistantChat } from '../components/AiAssistantChat';
import { AssistantContext } from '../services/geminiService';

// --- MOCK DATA ---
const mockUser = {
    firstName: 'Алексей',
    lastName: 'Иванов',
    role: 'Менеджер по продукту',
    email: 'a.ivanov@example.com',
    phone: '+7 (916) 123-45-67',
    avatarUrl: '', 
};

const mockActivity = [
    { id: 1, label: 'Активность за неделю', value: '12ч 45м', change: 8.2, data: [5, 6, 8, 7, 9, 10, 12] },
    { id: 2, label: 'Создано отчетов', value: '24', change: 15.0, data: [1, 3, 2, 4, 5, 4, 5] },
    { id: 3, label: 'KPI: User Engagement', value: '7.8/10', change: -2.1, data: [8, 8.2, 8.1, 7.9, 7.8, 7.7, 7.8] },
];

const mockHistory = [
    { id: 1, type: 'AI-анализ', description: 'Запрошен анализ по KPI "Выручка"', date: '2024-07-29 14:30' },
    { id: 2, type: 'Отчет', description: 'Сгенерирован отчет "Итоги Q2 2024"', date: '2024-07-29 11:15' },
    { id: 3, type: 'Настройки', description: 'Изменена цветовая схема на "Тёмная"', date: '2024-07-28 18:00' },
    { id: 4, type: 'Профиль', description: 'Обновлен номер телефона', date: '2024-07-27 09:45' },
];

const mockNotifications = [
    { id: 1, text: 'Ваш ежемесячный отчет готов к просмотру.', read: false },
    { id: 2, text: 'KPI "Конверсия" показал значительный рост (+12%).', read: false },
    { id: 3, text: 'Система будет недоступна 30.07 с 02:00 до 03:00.', read: true },
];

// --- TYPES ---
type UserData = typeof mockUser;
type FormErrors = Partial<Record<keyof UserData, string>>;

// --- HELPER COMPONENTS ---
const Sparkline: React.FC<{ data: number[], positiveIsGood: boolean, change: number }> = ({ data, positiveIsGood, change }) => {
    const isPositive = change >= 0;
    const isGood = isPositive === positiveIsGood;
    const color = isGood ? 'stroke-green-400' : 'stroke-red-400';
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${40 - (d / Math.max(...data, 1)) * 35}`).join(' ');
    return <svg className="w-24 h-10" viewBox="0 0 100 40"><polyline fill="none" strokeWidth="2" points={points} className={color}/></svg>;
};


export const PersonalAccount: React.FC = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [userData, setUserData] = useState<UserData>(mockUser);
    const [initialUserData, setInitialUserData] = useState<UserData>(mockUser);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<'history' | 'notifications'>('history');
    const [history, setHistory] = useState(mockHistory);
    const [notifications, setNotifications] = useState(mockNotifications);

    const assistantContext: AssistantContext = {
        user: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
        },
        activitySummary: mockActivity.map(({ label, value, change }) => ({ label, value, change })),
    };

    const validateField = (name: keyof UserData, value: string): string => {
        if (name === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
            return 'Неверный формат email';
        }
        if ((name === 'firstName' || name === 'lastName') && value.trim().length < 2) {
            return 'Поле должно содержать минимум 2 символа';
        }
        return '';
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target as { name: keyof UserData, value: string };
        setUserData(prev => ({ ...prev, [name]: value }));
        if(formErrors[name]) {
             setFormErrors(prev => ({...prev, [name]: validateField(name, value)}))
        }
    };
    
    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target as { name: keyof UserData, value: string };
        const error = validateField(name, value);
        setFormErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleEdit = () => {
        setInitialUserData(userData);
        setIsEditing(true);
    };

    const handleSave = () => {
        const errors: FormErrors = {};
        let hasErrors = false;
        (Object.keys(userData) as Array<keyof UserData>).forEach(key => {
            const error = validateField(key, userData[key]);
            if (error) {
                errors[key] = error;
                hasErrors = true;
            }
        });
        setFormErrors(errors);
        
        if (!hasErrors) {
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setUserData(initialUserData);
        setAvatarPreview(null);
        setFormErrors({});
        setIsEditing(false);
    };

    const handleFile = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDragEvents = (e: React.DragEvent, type: 'enter' | 'leave' | 'over') => {
        e.preventDefault();
        e.stopPropagation();
        if (!isEditing) return;
        if (type === 'enter' || type === 'over') setIsDragging(true);
        else if (type === 'leave') setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!isEditing) return;
        handleDragEvents(e, 'leave');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleClearHistory = () => {
        if (window.confirm('Вы уверены, что хотите очистить всю историю действий?')) {
            setHistory([]);
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold mb-2 sm:mb-0">Профиль пользователя</h2>
                    {!isEditing && (
                        <button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-cyan-600 dark:text-cyan-400 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 text-sm self-start sm:self-center">
                            <EditIcon className="w-4 h-4" /><span>Редактировать</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
                    <div className="md:col-span-4 flex flex-col items-center">
                        <div className="relative w-32 h-32 mb-4" onDragEnter={(e) => handleDragEvents(e, 'enter')} onDragLeave={(e) => handleDragEvents(e, 'leave')} onDragOver={(e) => handleDragEvents(e, 'over')} onDrop={handleDrop} onClick={() => isEditing && fileInputRef.current?.click()}>
                            <div className={`w-full h-full bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center border-4 border-gray-200 dark:border-gray-600 overflow-hidden transition-all ${isEditing ? 'cursor-pointer' : ''}`}>
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : userData.avatarUrl ? (
                                    <img src={userData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <UserCircleIcon className="w-24 h-24 text-gray-400 dark:text-gray-500" />
                                )}
                            </div>
                             {isEditing && (
                                <div className={`absolute inset-0 rounded-full flex flex-col items-center justify-center bg-black/70 text-white transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
                                    <UploadCloudIcon className="w-8 h-8 mb-1" />
                                    <span className="text-xs text-center">Загрузить</span>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)} accept="image/*" className="hidden" />
                        <h3 className="text-xl font-bold text-center">{userData.firstName} {userData.lastName}</h3>
                        <p className="text-md text-cyan-600 dark:text-cyan-400 text-center">{userData.role}</p>
                    </div>

                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {Object.entries({firstName: 'Имя', lastName: 'Фамилия', email: 'Email', phone: 'Телефон'}).map(([key, label]) => (
                            <div key={key}>
                                <label htmlFor={key} className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</label>
                                <input type={key === 'email' ? 'email' : 'text'} id={key} name={key} value={userData[key as keyof UserData]} onChange={handleInputChange} onBlur={handleInputBlur} disabled={!isEditing}
                                    className={`w-full bg-gray-100 dark:bg-gray-800 border rounded-lg px-3 py-2 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 transition-colors disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed ${formErrors[key as keyof UserData] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-cyan-500'}`}
                                />
                                {formErrors[key as keyof UserData] && <p className="text-red-500 text-xs mt-1">{formErrors[key as keyof UserData]}</p>}
                            </div>
                        ))}
                    </div>
                </div>

                {isEditing && (
                    <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
                        <button onClick={handleCancel} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Отмена</button>
                        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors"><SaveIcon className="w-5 h-5" />Сохранить</button>
                    </footer>
                )}
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
                <h3 className="text-xl font-bold mb-4">Статистика активности</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mockActivity.map(item => (
                        <div key={item.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                                <p className="text-2xl font-bold">{item.value}</p>
                                <div className={`flex items-center text-sm ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {item.change >= 0 ? <TrendingUpIcon className="w-4 h-4 mr-1"/> : <TrendingDownIcon className="w-4 h-4 mr-1"/>}
                                    {item.change}%
                                </div>
                            </div>
                            <Sparkline data={item.data} change={item.change} positiveIsGood={item.id !== 3} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                        <div className="flex gap-4">
                           {[{id: 'history', label: 'История действий', icon: <HistoryIcon/>}, {id: 'notifications', label: 'Уведомления', icon: <BellIcon/>}].map(tab => (
                               <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 pb-2 border-b-2 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'text-cyan-600 dark:text-cyan-400 border-cyan-500' : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-white'}`}>
                                  {React.cloneElement(tab.icon, { className: 'w-5 h-5' })} {tab.label}
                               </button>
                           ))}
                        </div>
                        {activeTab === 'history' && history.length > 0 && <button onClick={handleClearHistory} className="text-gray-500 dark:text-gray-400 hover:text-red-500 text-sm flex items-center gap-1"><Trash2Icon className="w-4 h-4"/>Очистить</button>}
                    </div>

                    {activeTab === 'history' ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {history.map(item => (
                                <div key={item.id} className="flex items-start justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <div>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.type === 'AI-анализ' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300'}`}>{item.type}</span>
                                        <p className="text-sm mt-1">{item.description}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4">{item.date}</p>
                                </div>
                            ))}
                            {history.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">История действий пуста.</p>}
                        </div>
                    ) : (
                         <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {notifications.map(n => (
                                <div key={n.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${n.read ? 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                    <p className="text-sm">{n.text}</p>
                                    <div className="flex items-center gap-2">
                                        {!n.read && <button onClick={() => setNotifications(ns => ns.map(i => i.id === n.id ? {...i, read: true} : i))} className="text-green-500 hover:text-green-400" title="Прочитано"><CheckCircle2Icon className="w-5 h-5"/></button>}
                                        <button onClick={() => setNotifications(ns => ns.filter(i => i.id !== n.id))} className="text-gray-400 hover:text-red-500" title="Удалить"><Trash2Icon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                             {notifications.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">Нет новых уведомлений.</p>}
                        </div>
                    )}
                </div>

                <div className="space-y-6 sm:space-y-8">
                     <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
                         <h3 className="text-lg font-bold mb-4">Действия</h3>
                         <div className="space-y-3">
                             <button className="w-full text-left flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><span className="flex items-center gap-3"><KeyRoundIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400"/>Сменить пароль</span><ArrowRightIcon className="w-5 h-5 text-gray-400"/></button>
                             <button className="w-full text-left flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <span className="flex items-center gap-3"><BrainCircuitIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400"/>Панель управления</span> <ArrowRightIcon className="w-5 h-5 text-gray-400"/>
                             </button>
                         </div>
                    </div>
                </div>
            </div>
            <AiAssistantChat context={assistantContext} />
        </div>
    );
};