import React, { useState, useEffect } from 'react';
import { MainLayout } from './components/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { PersonalAccount } from './pages/PersonalAccount';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { GuidedTour, TourStep } from './components/GuidedTour';
import { BrainCircuitIcon } from './components/icons';


export type Theme = 'light' | 'dark';

export interface Kpi {
  id: string;
  title: string;
  value: string;
  rawValue?: number; // Raw number for animations
  valueType?: 'currency' | 'integer' | 'percent' | 'hours' | string; // For formatting
  change: number;
  changeType: 'week' | 'month' | 'quarter' | string;
  icon: React.ReactElement;
  category?: 'Финансы' | 'Маркетинг' | 'Клиенты' | 'HR' | 'Разработка';
  department?: 'Отдел продаж' | 'HR-отдел' | 'Отдел разработки' | 'Маркетинг';
  metricType?: 'Финансовый' | 'Операционный' | 'Клиентский' | 'HR';
  history?: number[];
}

export type ChatMessage = {
    role: 'user' | 'model';
    text: string;
};

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const storedTheme = window.localStorage.getItem('theme');
            if (storedTheme) {
                return storedTheme as Theme;
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'dark'; // Default theme
    });
    
    // Guided Tour State
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [tourStepIndex, setTourStepIndex] = useState(0);

    const tourSteps: TourStep[] = [
      {
        targetId: 'tour-step-1-welcome',
        title: 'Добро пожаловать!',
        content: 'Это интерактивная демонстрация аналитической платформы. Давайте познакомимся с ключевыми возможностями.',
        placement: 'center',
        customContent: () => <div className="flex flex-col items-center text-center"><BrainCircuitIcon className="w-16 h-16 text-cyan-400 mb-4" /><p>Это интерактивная демонстрация аналитической платформы. Давайте познакомимся с ключевыми возможностями.</p></div>
      },
      {
        targetId: 'tour-step-2-daterange',
        title: 'Управление периодом',
        content: 'Вы можете изменять временной диапазон. Все KPI и графики на панели управления автоматически обновятся.',
        page: 'dashboard',
      },
      {
        targetId: 'tour-step-3-kpicard',
        title: 'Интерактивные KPI',
        content: 'Каждый показатель — это не просто цифра. Нажмите кнопку "AI-анализ", чтобы получить глубокую аналитику, прогнозы и задать вопросы ассистенту.',
        page: 'dashboard',
      },
      {
        targetId: 'tour-step-4-viewswitcher',
        title: 'Режимы просмотра',
        content: 'Переключайтесь между общим обзором и детальной аналитикой, где можно сравнивать тренды и изучать корреляции.',
        page: 'dashboard',
      },
      {
        targetId: 'tour-step-5-reports-tab',
        title: 'Гибкие отчеты',
        content: 'Теперь перейдем в раздел отчетов. Здесь вы можете создавать сводки по разным направлениям.',
        page: 'dashboard',
        action: () => setActiveTab('reports'),
      },
      {
        targetId: 'tour-step-6-report-generator',
        title: 'Генератор отчетов',
        content: 'Сгенерируйте отчет, чтобы увидеть данные, а затем получите по ним AI-анализ и скачайте в нужном формате.',
        page: 'reports',
      },
      {
        targetId: 'tour-step-7-assistant-fab',
        title: 'Ваш AI-Советник',
        content: 'В любой момент вы можете обратиться к персональному AI-советнику. Он имеет доступ к вашему контексту и поможет с любым вопросом.',
        page: 'reports', // Can be on any page
      },
    ];

    useEffect(() => {
        // Automatically start tour on first visit
        if (sessionStorage.getItem('hasSeenTour') !== 'true') {
            setIsTourOpen(true);
            sessionStorage.setItem('hasSeenTour', 'true');
        }
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.remove('dark');
            root.classList.add('light');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    // Ensure the correct page is shown for the tour step
    useEffect(() => {
        if (isTourOpen) {
            const currentPage = tourSteps[tourStepIndex].page;
            if (currentPage && activeTab !== currentPage) {
                setActiveTab(currentPage);
            }
        }
    }, [isTourOpen, tourStepIndex, activeTab]);

    const handleNextStep = () => {
        const nextStepIndex = tourStepIndex + 1;
        if (nextStepIndex < tourSteps.length) {
            const nextStep = tourSteps[nextStepIndex];
            if (nextStep.action) {
                nextStep.action();
            }
             // Small delay to allow page transition before showing the next step
            setTimeout(() => setTourStepIndex(nextStepIndex), 100);
        } else {
            handleFinishTour();
        }
    };
    
    const handlePrevStep = () => {
        const prevStepIndex = tourStepIndex - 1;
        if (prevStepIndex >= 0) {
            const prevStep = tourSteps[prevStepIndex];
             if (prevStep.action) {
                prevStep.action();
            }
            setTimeout(() => setTourStepIndex(prevStepIndex), 100);
        }
    };
    
    const handleFinishTour = () => {
        setIsTourOpen(false);
        setTourStepIndex(0);
    };


    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'account':
                return <PersonalAccount />;
            case 'reports':
                return <Reports />;
            case 'settings':
                return <Settings theme={theme} toggleTheme={toggleTheme} />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <>
            <MainLayout 
                activeTab={activeTab} 
                setActiveTab={setActiveTab}
                theme={theme}
                toggleTheme={toggleTheme}
            >
                {renderContent()}
            </MainLayout>
            <GuidedTour
                isOpen={isTourOpen}
                steps={tourSteps}
                currentStepIndex={tourStepIndex}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
                onFinish={handleFinishTour}
            />
        </>
    );
};

export default App;