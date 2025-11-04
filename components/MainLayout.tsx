import React from 'react';
import { 
    BrainCircuitIcon, UserCircleIcon, LayoutDashboardIcon, 
    FilePieChartIcon, SettingsIcon, BellIcon, SunIcon, MoonIcon 
} from './icons';
import { Theme } from '../App';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: Theme;
  toggleTheme: () => void;
}

const navItems = [
    { id: 'account', label: 'Личный кабинет', icon: <UserCircleIcon className="w-5 h-5" /> },
    { id: 'dashboard', label: 'Панель управления', icon: <LayoutDashboardIcon className="w-5 h-5" /> },
    { id: 'reports', label: 'Отчеты', icon: <FilePieChartIcon className="w-5 h-5" /> },
    { id: 'settings', label: 'Настройки', icon: <SettingsIcon className="w-5 h-5" /> },
];

export const MainLayout: React.FC<MainLayoutProps> = ({ children, activeTab, setActiveTab, theme, toggleTheme }) => {
    
    const activeLabel = navItems.find(item => item.id === activeTab)?.label || 'Панель управления';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-200 flex flex-col sm:flex-row">
            {/* Sidebar */}
            <aside className="w-full sm:w-64 bg-white dark:bg-gray-900 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0">
                <div className="flex items-center gap-3 h-16 sm:h-20 px-6 border-b border-gray-200 dark:border-gray-800">
                    <BrainCircuitIcon className="w-8 h-8 text-cyan-500 dark:text-cyan-400" />
                    <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">KPI Аналитика</span>
                </div>
                <nav className="flex-grow px-4 py-4 sm:py-6">
                    <ul className="flex flex-row sm:flex-col sm:space-y-1 justify-around sm:justify-start">
                        {navItems.map(item => (
                            <li key={item.id}>
                                <button
                                    id={`tour-step-${item.id === 'reports' ? '5-reports-tab' : ''}`}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center justify-center sm:justify-start gap-3 px-2 sm:px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                                        activeTab === item.id 
                                            ? 'bg-cyan-50 dark:bg-cyan-900/50 text-cyan-700 dark:text-white' 
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                                >
                                    {item.icon}
                                    <span className="hidden sm:inline">{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                 <footer className="p-6 mt-auto hidden sm:block">
                    <p className="text-gray-500 dark:text-gray-500 text-xs text-center">Разработано с Gemini API</p>
                </footer>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <header className="flex items-center justify-between h-16 sm:h-20 px-4 sm:px-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{activeLabel}</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                            {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                        </button>
                        <div className="relative">
                            <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                                <BellIcon className="w-6 h-6" />
                            </button>
                             <span className="absolute top-1.5 right-1.5 block w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                   <div className="w-full max-w-7xl mx-auto">
                        {children}
                   </div>
                </main>
            </div>
        </div>
    );
};