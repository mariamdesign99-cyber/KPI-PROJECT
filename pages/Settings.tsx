import React, { useState } from 'react';
import { Theme } from '../App';
import { PaletteIcon, LanguagesIcon, BellIcon, KeyRoundIcon, UserCircleIcon, SunIcon, MoonIcon } from '../components/icons';

interface SettingsProps {
    theme: Theme;
    toggleTheme: () => void;
}

const SettingsCard: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactElement }> = ({ title, children, icon }) => (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
            {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6 text-cyan-600 dark:text-cyan-400' })}
            {title}
        </h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
        <div>{children}</div>
    </div>
);

export const Settings: React.FC<SettingsProps> = ({ theme, toggleTheme }) => {
    const [language, setLanguage] = useState('ru');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(false);

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <header>
                <h1 className="text-xl font-semibold tracking-tight">Настройки</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Управляйте вашим аккаунтом и предпочтениями</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SettingsCard title="Внешний вид" icon={<PaletteIcon />}>
                    <div className="flex items-center justify-between">
                         <span className="text-sm text-gray-600 dark:text-gray-300">Тема оформления</span>
                         <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <button onClick={() => theme !== 'light' && toggleTheme()} className={`p-2 rounded-md ${theme === 'light' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}>
                                <SunIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={() => theme !== 'dark' && toggleTheme()} className={`p-2 rounded-md ${theme === 'dark' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}>
                                <MoonIcon className="w-5 h-5"/>
                            </button>
                         </div>
                    </div>
                     <SettingRow label="Язык интерфейса">
                        <select value={language} onChange={e => setLanguage(e.target.value)} className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-cyan-500">
                            <option value="ru">Русский</option>
                            <option value="en">English</option>
                        </select>
                    </SettingRow>
                </SettingsCard>
                
                <SettingsCard title="Уведомления" icon={<BellIcon />}>
                     <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Email-уведомления</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={emailNotifications} onChange={() => setEmailNotifications(p => !p)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-400 dark:peer-focus:ring-cyan-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
                        </label>
                    </div>
                    <SettingRow label="Push-уведомления">
                         <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={pushNotifications} onChange={() => setPushNotifications(p => !p)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-400 dark:peer-focus:ring-cyan-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
                        </label>
                    </SettingRow>
                </SettingsCard>

                <SettingsCard title="Аккаунт" icon={<UserCircleIcon />}>
                    <SettingRow label="Изменить email">
                        <button className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">Изменить</button>
                    </SettingRow>
                    <SettingRow label="Изменить номер телефона">
                        <button className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">Изменить</button>
                    </SettingRow>
                </SettingsCard>

                <SettingsCard title="Безопасность" icon={<KeyRoundIcon />}>
                    <SettingRow label="Изменить пароль">
                        <button className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">Изменить</button>
                    </SettingRow>
                    <SettingRow label="Двухфакторная аутентификация">
                         <button className="text-sm font-semibold text-red-500 hover:underline">Выключена</button>
                    </SettingRow>
                </SettingsCard>
            </div>
        </div>
    );
};