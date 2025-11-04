
import { GoogleGenAI } from "@google/genai";
import { Kpi, ChatMessage } from "../App";
import { AnalysisData } from "../components/KpiCard";
import { ReportData } from '../services/reportService';

// --- Singleton AI Instance ---
let aiInstance: GoogleGenAI | null = null;

function getAiInstance(): GoogleGenAI {
    if (aiInstance) {
        return aiInstance;
    }

    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
        // This error will be caught by the calling function's try...catch block.
        throw new Error("Ключ API не настроен. Функции AI недоступны.");
    }

    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
    return aiInstance;
}


export async function generateKpiConcept(businessGoal: string): Promise<string> {
  const prompt = `
    Ты — опытный разработчик ПО и архитектор. Тебе нужно придумать концепцию аналитической системы для расчёта и анализа KPI в бизнесе.

    Бизнес-цель: "${businessGoal}"

    Основываясь на этой цели, сгенерируй ответ, который включает в себя:
    1.  Краткое архитектурное решение (модули, взаимодействие, виды данных, точки интеграции с внешними системами).
    2.  Список основных пользовательских сценариев (3–6).

    Требования к ответу:
    - Не пиши длинных рассуждений — только чёткая структура.
    - Ответ должен быть на русском языке.
    - Строго следуй формату вывода ниже, используя ТОЧНО такие же заголовки-маркеры.

    ### АРХИТЕКТУРНОЕ РЕШЕНИЕ
    (Здесь должно быть описание архитектуры)

    ### ПОЛЬЗОВАТЕЛЬСКИЕ СЦЕНАРИИ
    (Здесь должен быть список сценариев)
  `;

  try {
    const ai = getAiInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    const errorMessage = `Ошибка при генерации концепции: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMessage);
    return errorMessage;
  }
}


export async function generateTz(businessGoal: string, architecture: string, scenarios: string): Promise<string> {
    const prompt = `
    Ты — опытный системный аналитик и инженер. Твоя задача — составить подробное техническое задание (ТЗ) для реализации MVP аналитической системы KPI.

    ИСХОДНЫЕ ДАННЫЕ:
    
    1. Бизнес-цель: "${businessGoal}"
    
    2. Предложенное архитектурное решение:
    ${architecture}

    3. Основные пользовательские сценарии:
    ${scenarios}

    ЗАДАЧА:
    На основе этих данных, составь ТЗ в формате Markdown, которое можно передать команде разработчиков.
    
    ТЗ должно включать следующие разделы, четко разделенные заголовками:
    
    # Техническое задание: MVP Аналитической системы KPI
    
    ## 1. Введение
    Краткое описание системы и ее назначения на основе бизнес-цели.
    
    ## 2. Функциональные требования
    - **FR-1: Сбор данных:** ...
    - **FR-2: Обработка и расчёт KPI:** ...
    - **FR-3: Визуализация данных (Дашборды):** ...
    - **FR-4: Управление пользователями и ролями (минимальный набор):** ...
    - **FR-5: Формирование отчётов:** ...

    ## 3. Нефункциональные требования
    ### 3.1. Производительность
    - **NFR-1.1:** Время загрузки дашборда...
    - **NFR-1.2:** Время ответа API...
    ### 3.2. Безопасность
    - **NFR-2.1:** Аутентификация и авторизация...
    - **NFR-2.2:** Защита данных...
    
    ## 4. API-интерфейсы
    Краткое описание основных эндпоинтов (RESTful API). Например:
    - \`POST /api/v1/data-source\`: Загрузка данных.
    - \`GET /api/v1/kpi?name=...\`: Получение рассчитанных KPI.
    - \`GET /api/v1/dashboard/...\`: Получение данных для дашборда.
    
    ## 5. Требования к хранилищу данных
    Предложи реляционную или нереляционную модель данных, опиши основные таблицы/коллекции.
    
    ## 6. Форматы входных данных
    Опиши поддерживаемые форматы (например, CSV, JSON) и структуру для каждого.
    
    ## 7. Форматы отчётов
    Опиши форматы для экспорта (например, PDF, XLSX).
    
    ## 8. Критерии приемочного тестирования
    - **AC-1:** Пользователь может успешно загрузить CSV-файл с данными...
    - **AC-2:** На главном дашборде корректно отображаются KPI X и Y...
    - **AC-3:** Отчет за месяц успешно генерируется в формате PDF...
    
    Требования к ответу:
    - Будь конкретным и лаконичным.
    - Заполни каждый пункт информацией, релевантной для MVP.
    - Ответ должен быть на русском языке.
    `;

    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        const errorMessage = `Ошибка при генерации ТЗ: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        return errorMessage;
    }
}

export interface AiAnalysisInput {
    kpiName: string;
    trendDescription: string;
    forecast: string;
    drivers: string[];
}

export async function generateAiAnalysis(input: AiAnalysisInput): Promise<string> {
    const prompt = `
    Ты — опытный дата-сайентист и бизнес-аналитик. Твоя задача — проанализировать данные по KPI и предоставить краткий, но содержательный отчет для руководителя.

    АНАЛИТИЧЕСКИЕ ДАННЫЕ:
    - **Показатель (KPI):** ${input.kpiName}
    - **Обнаруженный тренд:** ${input.trendDescription}
    - **Прогноз на следующий период:** ${input.forecast}
    - **Вероятные драйверы изменений:** ${input.drivers.join(', ')}

    ЗАДАЧА:
    Сгенерируй человекопонятный текст с рекомендациями. Ответ должен быть на русском языке и строго следовать формату ниже. Используй ТОЧНО такие же заголовки-маркеры.

    ### ОБЩАЯ ОЦЕНКА
    (Здесь краткое резюме по текущей ситуации с KPI в 1-2 предложениях. Например: "Наблюдается устойчивый положительный тренд, обусловленный...")

    ### РЕКОМЕНДАЦИИ
    (Здесь 2-3 конкретных, действенных рекомендации в виде маркированного списка. Например:
    - **Усилить:** Рекомендуется увеличить бюджет на маркетинговые кампании, так как они являются ключевым драйвером роста.
    - **Исследовать:** Стоит проанализировать падение конверсии в последнюю неделю, чтобы выявить возможные технические проблемы.
    )
    `;

    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        const errorMessage = `Ошибка при генерации AI-анализа: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        return errorMessage;
    }
}

export interface ChatInput {
    kpi: Kpi;
    initialAnalysis: AnalysisData;
    chatHistory: ChatMessage[];
    newUserQuestion: string;
}

export async function generateChatResponse(input: ChatInput): Promise<string> {
    const historyString = input.chatHistory
        .map(msg => `${msg.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${msg.text}`)
        .join('\n');

    const prompt = `
    Ты — полезный и дружелюбный бизнес-ассистент. Твоя задача — отвечать на вопросы пользователя об аналитике KPI.

    КОНТЕКСТ АНАЛИЗА:
    - **Анализируемый KPI:** ${input.kpi.title}
    - **Текущее значение:** ${input.kpi.value}
    - **Первоначальная автоматическая оценка:** ${input.initialAnalysis.geminiText.summary}
    - **Первоначальные рекомендации:** ${input.initialAnalysis.geminiText.recommendations}
    
    ИСТОРИЯ ДИАЛОГА:
    ${historyString}

    НОВЫЙ ВОПРОС ПОЛЬЗОВАТЕЛЯ:
    "${input.newUserQuestion}"

    ЗАДАЧА:
    Основываясь на всем предоставленном контексте, дай краткий и ясный ответ на новый вопрос пользователя. Отвечай на русском языке. Будь лаконичен.
    `;
    
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        const errorMessage = `Ошибка при генерации ответа в чате: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        return errorMessage;
    }
}


export async function* generateChatResponseStream(input: ChatInput): AsyncGenerator<string> {
    try {
        const ai = getAiInstance();
        const contents = [
            ...input.chatHistory.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            })),
            { role: 'user', parts: [{ text: input.newUserQuestion }] }
        ];

        const systemInstruction = `
        Ты — полезный и дружелюбный бизнес-ассистент. Твоя задача — отвечать на вопросы пользователя об аналитике KPI.

        КОНТЕКСТ АНАЛИЗА:
        - **Анализируемый KPI:** ${input.kpi.title}
        - **Текущее значение:** ${input.kpi.value}
        - **Первоначальная автоматическая оценка:** ${input.initialAnalysis.geminiText.summary}
        - **Первоначальные рекомендации:** ${input.initialAnalysis.geminiText.recommendations}
        
        Основываясь на всем предоставленном контексте (включая историю диалога), дай краткий и ясный ответ на новый вопрос пользователя. Отвечай на русском языке. Будь лаконичен.
        `;
        
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-pro',
            contents: contents as any,
            config: {
                systemInstruction,
            },
        });

        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    } catch (error) {
        const errorMessage = `Ошибка в потоке чата: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        yield errorMessage;
    }
}

export interface AssistantContext {
    user: {
        firstName: string;
        lastName: string;
        role: string;
    };
    activitySummary: {
        label: string;
        value: string;
        change: number;
    }[];
}

export async function* generateAssistantResponseStream(
    chatHistory: ChatMessage[], 
    context: AssistantContext
): AsyncGenerator<string> {
    try {
        const ai = getAiInstance();
        const latestUserMessage = chatHistory[chatHistory.length - 1];
        if (!latestUserMessage || latestUserMessage.role !== 'user') {
            return; 
        }
        
        const historyForApi = chatHistory.slice(1).map(msg => ({
            role: msg.role as ('user' | 'model'),
            parts: [{ text: msg.text }]
        }));
        
        const contextString = `
        ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ДЛЯ КОНТЕКСТА:
        - Имя: ${context.user.firstName} ${context.user.lastName}
        - Должность: ${context.user.role}
        - Сводка активности:
          ${context.activitySummary.map(a => `- ${a.label}: ${a.value} (изменение ${a.change > 0 ? '+' : ''}${a.change}%)`).join('\n      ')}
        `;

        const systemInstruction = `
        Ты — умный и проактивный AI-советник, встроенный в личный кабинет пользователя на аналитической платформе KPI.
        Твоя задача — помогать пользователю, отвечая на его вопросы и давая полезные советы на основе предоставленных данных.
        - Обращайся к пользователю по имени (${context.user.firstName}).
        - Будь кратким, дружелюбным и по делу.
        - Используй данные из контекста для формирования ответов.
        - Не придумывай данные, которых нет в контексте.
        - Ответы должны быть в формате простого текста, без Markdown.
        - Отвечай на русском языке.
        `;
        
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-pro',
            contents: historyForApi,
            config: {
                systemInstruction: `${systemInstruction}\n${contextString}`,
            },
        });

        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    } catch (error) {
        const errorMessage = `Ошибка в потоке ассистента: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        yield errorMessage;
    }
}

export interface OverallAnalysisInput {
    kpis: {
        title: string;
        value: string;
        change: number;
        changeType: string;
        trendDescription: string;
    }[];
    period: string;
}

export async function generateOverallAnalysis(input: OverallAnalysisInput): Promise<string> {
    const kpiSummaries = input.kpis.map(kpi => 
        `- **${kpi.title}**: Текущее значение ${kpi.value} (изменение ${kpi.change > 0 ? '+' : ''}${kpi.change}% за ${kpi.changeType}). Тренд: ${kpi.trendDescription}.`
    ).join('\n');

    const prompt = `
    Ты — ведущий бизнес-аналитик в крупной технологической компании. Твоя задача — провести комплексный анализ нескольких KPI за указанный период и предоставить руководству сводный отчет.

    ВХОДНЫЕ ДАННЫЕ:
    - **Анализируемый период:** ${input.period}
    - **Набор KPI для анализа:**
    ${kpiSummaries}

    ЗАДАЧА:
    Сгенерируй подробный, но лаконичный отчет в формате Markdown. Отчет должен быть на русском языке и строго следовать структуре ниже.

    # Сводный Аналитический Отчет

    ## 1. Общая оценка ситуации
    (Здесь дай краткое резюме на 2-3 предложения. Опиши общее состояние дел: компания растет, стагнирует или сталкивается с проблемами? Какие тенденции доминируют?)

    ## 2. Ключевые взаимосвязи и инсайты
    (Это самый важный раздел. Проанализируй, как показатели влияют друг на друга. Например: "Рост продаж (+12.1%) напрямую связан с увеличением конверсии (+0.3%), что указывает на успешность новой маркетинговой кампании. Однако, это привело к небольшому снижению числа новых клиентов (-2.5%), возможно, из-за фокуса на более качественные лиды." Найди 2-3 таких инсайта.)

    ## 3. Стратегические рекомендации
    (На основе анализа, предложи 3-4 конкретных и действенных рекомендации в виде маркированного списка. Рекомендации должны быть направлены на усиление позитивных трендов и минимизацию негативных.)
    - **Пример 1:** Усилить маркетинговые каналы, показавшие наилучшую конверсию.
    - **Пример 2:** Проанализировать причины оттока клиентов, несмотря на общий рост выручки.
    - **Пример 3:** ...

    Будь профессионален, объективен и ориентирован на бизнес-результат.
    `;

    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        const errorMessage = `Ошибка при создании общего анализа: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        return errorMessage;
    }
}

export interface OverallChatInput {
    kpis: Pick<Kpi, 'title' | 'value' | 'change'>[];
    period: string;
    initialAnalysis: string;
    chatHistory: ChatMessage[];
    newUserQuestion: string;
}

export async function* generateOverallChatResponseStream(input: OverallChatInput): AsyncGenerator<string> {
    try {
        const ai = getAiInstance();
        const kpiSummaries = input.kpis.map(kpi => 
            `- ${kpi.title}: ${kpi.value} (изменение ${kpi.change > 0 ? '+' : ''}${kpi.change}%)`
        ).join('\n');

        const historyForApi = input.chatHistory.slice(1).map(msg => ({
            role: msg.role as ('user' | 'model'),
            parts: [{ text: msg.text }]
        }));
        
        historyForApi.push({ role: 'user', parts: [{ text: input.newUserQuestion }] });

        const systemInstruction = `
        Ты — ведущий бизнес-аналитик. Ты уже предоставил сводный отчет по KPI. Теперь твоя задача — отвечать на уточняющие вопросы пользователя, основываясь на этом отчете и данных по KPI.

        КОНТЕКСТ АНАЛИЗА:
        - **Анализируемый период:** ${input.period}
        - **Анализируемые KPI:**
        ${kpiSummaries}
        - **Твой первоначальный сводный отчет:**
        ${input.initialAnalysis}
        
        ЗАДАЧА:
        Основываясь на всем предоставленном контексте и истории диалога, дай краткий, ясный и профессиональный ответ на новый вопрос пользователя. Отвечай на русском языке. Будь лаконичен.
        `;
        
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-pro',
            contents: historyForApi,
            config: {
                systemInstruction,
            },
        });

        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    } catch (error) {
        const errorMessage = `Ошибка в потоке общего чата: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        yield errorMessage;
    }
}

export async function generateDeepDiveAnalysis(kpiName: string, data: number[], period: string): Promise<string> {
    try {
        const ai = getAiInstance();
        const stats = {
            avg: (data.reduce((a, b) => a + b, 0) / data.length).toFixed(2),
            max: Math.max(...data).toFixed(2),
            min: Math.min(...data).toFixed(2),
            change: data.length > 1 ? (((data[data.length - 1] - data[0]) / (data[0] || 1)) * 100).toFixed(1) : '0.0'
        };

        const prompt = `
        Ты — старший дата-аналитик. Проведи глубокий анализ KPI "${kpiName}" за период "${period}".

        ВХОДНЫЕ ДАННЫЕ:
        - **Среднее значение:** ${stats.avg}
        - **Максимум:** ${stats.max}
        - **Минимум:** ${stats.min}
        - **Общее изменение за период:** ${stats.change}%

        ЗАДАЧА:
        Сгенерируй краткий, но емкий аналитический отчет в формате Markdown. Отчет должен быть на русском языке.

        ### Ключевые наблюдения
        (Опиши основной тренд, волатильность и выдели 1-2 значимых пика или просадки в данных. Например: "Показатель демонстрирует устойчивый рост с периодическими коррекциями в середине недели...")

        ### Возможные причины
        (Предложи 2-3 гипотезы, которые могли бы объяснить наблюдаемую динамику. Будь конкретен. Например: "Рост может быть связан с запуском новой рекламной кампании X, а просадка 15-го числа - с техническими работами на сервере.")

        ### Рекомендации
        (Дай 2 конкретные рекомендации в виде маркированного списка. Например: 
        - **Масштабировать:** Увеличить бюджет на кампанию X, так как она показывает высокую эффективность.
        - **Исследовать:** Проанализировать данные за 15-е число, чтобы подтвердить влияние технических работ.)
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        const errorMessage = `Ошибка при глубоком анализе: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        return errorMessage;
    }
}

export async function generateCorrelationAnalysis(kpi1Name: string, kpi2Name: string, correlation: number): Promise<string> {
    try {
        const ai = getAiInstance();
        const correlationStrength = Math.abs(correlation);
        let strengthDescription: string;
        if (correlationStrength >= 0.7) {
            strengthDescription = 'сильная';
        } else if (correlationStrength >= 0.4) {
            strengthDescription = 'умеренная';
        } else if (correlationStrength >= 0.2) {
            strengthDescription = 'слабая';
        } else {
            strengthDescription = 'очень слабая или отсутствует';
        }

        const directionDescription = correlation > 0 ? 'прямая (положительная)' : 'обратная (отрицательная)';

        const prompt = `
        Ты — опытный бизнес-аналитик. Твоя задача — кратко и понятно для менеджера интерпретировать коэффициент корреляции между двумя KPI.

        ДАННЫЕ:
        - KPI 1: "${kpi1Name}"
        - KPI 2: "${kpi2Name}"
        - Коэффициент корреляции: ${correlation.toFixed(3)}

        ИНТЕРПРЕТАЦИЯ КОЭФФИЦИЕНТА:
        - Сила связи: ${strengthDescription}
        - Направление связи: ${directionDescription}

        ЗАДАЧА:
        Напиши короткий вывод (2-3 предложения) на русском языке, который объясняет, что эта корреляция может означать на практике для бизнеса.
        - Не используй сложные статистические термины.
        - Предложи одну возможную причину такой взаимосвязи.
        - Ответ должен быть в формате простого текста, без заголовков и Markdown.

        Пример: "Наблюдается сильная положительная связь. Это означает, что рост выручки, как правило, сопровождается увеличением числа новых клиентов. Вероятно, это связано с успешными маркетинговыми кампаниями, которые привлекают платящих пользователей."
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        const errorMessage = `Ошибка при анализе корреляции: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        return errorMessage;
    }
}

export interface CorrelationChatInput {
    kpi1: Kpi;
    kpi2: Kpi;
    correlation: number;
    initialAnalysis: string;
    chatHistory: ChatMessage[];
    newUserQuestion: string;
}

export async function* generateCorrelationChatResponseStream(input: CorrelationChatInput): AsyncGenerator<string> {
    try {
        const ai = getAiInstance();
        const historyForApi = input.chatHistory.map(msg => ({
            role: msg.role as ('user' | 'model'),
            parts: [{ text: msg.text }]
        }));

        const systemInstruction = `
        Ты — опытный бизнес-аналитик. Ты уже предоставил краткую интерпретацию корреляции между двумя KPI. Теперь твоя задача — отвечать на уточняющие вопросы пользователя.

        КОНТЕКСТ АНАЛИЗА:
        - **Показатель 1:** ${input.kpi1.title}
        - **Показатель 2:** ${input.kpi2.title}
        - **Коэффициент корреляции:** ${input.correlation.toFixed(3)}
        - **Твоя первоначальная интерпретация:**
          ${input.initialAnalysis}
        
        ЗАДАЧА:
        Основываясь на всем предоставленном контексте и истории диалога, дай краткий, ясный и профессиональный ответ на новый вопрос пользователя. Отвечай на русском языке. Будь лаконичен.
        `;
        
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-pro',
            contents: historyForApi,
            config: {
                systemInstruction,
            },
        });

        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    } catch (error) {
        const errorMessage = `Ошибка в потоке чата по корреляции: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        yield errorMessage;
    }
}

export interface ReportAnalysisInput {
    kpis: {
        label: string;
        value: string | number;
        change: string;
    }[];
    period: string;
}

export async function generateReportAnalysis(input: ReportAnalysisInput): Promise<string> {
    const kpiSummaries = input.kpis.map(kpi => 
        `- **${kpi.label}**: ${kpi.value} (изменение ${kpi.change})`
    ).join('\n');

    const prompt = `
    Ты — старший бизнес-аналитик. Твоя задача — проанализировать сводный отчет по KPI за указанный период и предоставить краткий, но содержательный аналитический обзор.

    ДАННЫЕ ОТЧЕТА:
    - **Анализируемый период:** ${input.period}
    - **Ключевые показатели:**
    ${kpiSummaries}

    ЗАДАЧА:
    Сгенерируй отчет в формате Markdown. Отчет должен быть на русском языке и строго следовать структуре ниже.

    ### Краткая сводка
    (Здесь дай общее резюме на 2-3 предложения. Опиши основную тенденцию: положительная, отрицательная или смешанная.)

    ### Ключевые инсайты
    (Проанализируй данные и найди 2-3 интересных наблюдения или взаимосвязи. Например: "Рост выручки, вероятно, обусловлен увеличением конверсии, несмотря на небольшое снижение числа новых клиентов.")

    ### Рекомендации
    (На основе анализа, предложи 2-3 конкретных и действенных рекомендации в виде маркированного списка.)
    `;

    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        const errorMessage = `Ошибка при анализе отчета: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        return errorMessage;
    }
}


export interface ReportChatInput {
    reportData: ReportData;
    period: string;
    initialAnalysis: string;
    chatHistory: ChatMessage[];
    newUserQuestion: string;
}


export async function* generateReportChatResponseStream(input: ReportChatInput): AsyncGenerator<string> {
    try {
        const ai = getAiInstance();
        const kpiSummaries = input.reportData.kpis.map(kpi => 
           `- ${kpi.label}: ${kpi.value} (изменение ${kpi.change})`
       ).join('\n');
       
       const historyForApi = input.chatHistory.map(msg => ({
           role: msg.role as ('user' | 'model'),
           parts: [{ text: msg.text }]
       }));
       
       historyForApi.push({ role: 'user', parts: [{ text: input.newUserQuestion }] });

       const systemInstruction = `
       Ты — бизнес-аналитик, который помогает пользователю разобраться в отчете по KPI. Ты уже предоставил первоначальный анализ. Теперь отвечай на уточняющие вопросы.

       КОНТЕКСТ АНАЛИЗА:
       - **Анализируемый период:** ${input.period}
       - **Данные отчета:**
       ${kpiSummaries}
       - **Твой первоначальный анализ:**
       ${input.initialAnalysis}
       
       ЗАДАЧА:
       Основываясь на всем контексте и истории диалога, дай краткий и ясный ответ на новый вопрос пользователя. Отвечай на русском языке.
       `;
       
       const responseStream = await ai.models.generateContentStream({
           model: 'gemini-2.5-pro',
           contents: historyForApi,
           config: {
               systemInstruction,
           },
       });

       for await (const chunk of responseStream) {
           yield chunk.text;
       }
    } catch (error) {
        const errorMessage = `Ошибка в потоке чата по отчету: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        yield errorMessage;
    }
}