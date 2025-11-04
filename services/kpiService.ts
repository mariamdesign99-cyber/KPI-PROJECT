// Типы для входных данных и сценариев
export interface BaseMetrics {
  traffic: number;        // Количество посетителей
  conversionRate: number; // Коэффициент конверсии (в долях, например, 0.05 для 5%)
  avgOrderValue: number;  // Средний чек
  costs: number;          // Общие затраты
}

export type Scenario = Partial<{ [K in keyof BaseMetrics]: number }>;

// Тип для результатов
export interface KpiResult {
    key: string;
    name: string;
    baseValue: number;
    alternativeValue: number;
}

// Словарь с формулами для расчёта KPI
const kpiFormulas: { [key: string]: (m: BaseMetrics) => number } = {
  // Выручка = Трафик * Конверсия * Средний чек
  revenue: (m) => m.traffic * m.conversionRate * m.avgOrderValue,
  
  // Количество продаж = Трафик * Конверсия
  salesCount: (m) => m.traffic * m.conversionRate,

  // Прибыль = Выручка - Затраты
  profit: (m) => kpiFormulas.revenue(m) - m.costs,

  // ROI (Return on Investment) = (Прибыль / Затраты)
  roi: (m) => {
    if (m.costs === 0) return 0;
    return kpiFormulas.profit(m) / m.costs;
  },

  // CPA (Cost Per Acquisition) = Затраты / Количество продаж
  cpa: (m) => {
    const sales = kpiFormulas.salesCount(m);
    if (sales === 0) return 0;
    return m.costs / sales;
  },
  
  // ... можно добавить другие метрики, например, OEE, текучесть кадров и т.д.,
  // если будут предоставлены соответствующие базовые метрики
};

// Словарь с названиями KPI для отображения в UI
const kpiNames: { [key: string]: string } = {
    revenue: "Выручка",
    salesCount: "Кол-во продаж",
    profit: "Прибыль",
    roi: "ROI",
    cpa: "CPA (Стоимость привлечения)",
}

/**
 * Основная функция-модуль для расчёта и сравнения KPI.
 * @param baseMetrics - Объект с базовыми метриками.
 * @param scenario - Объект с множителями для изменения базовых метрик.
 * @param kpiKeys - Массив ключей KPI, которые нужно рассчитать.
 * @returns - Массив объектов с результатами для каждого KPI.
 */
export function calculateKpis(
  baseMetrics: BaseMetrics,
  scenario: Scenario,
  kpiKeys: string[]
): KpiResult[] {

  // 1. Применяем сценарий для получения альтернативных метрик
  const alternativeMetrics: BaseMetrics = { ...baseMetrics };
  for (const key in scenario) {
    if (key in alternativeMetrics) {
      const metricKey = key as keyof BaseMetrics;
      alternativeMetrics[metricKey] *= scenario[metricKey]!;
    }
  }

  // 2. Рассчитываем базовые и альтернативные значения для каждого запрошенного KPI
  const results = kpiKeys.map(key => {
    if (!kpiFormulas[key]) {
      // Если формула не найдена, возвращаем нулевые значения
      return { key, name: kpiNames[key] || key, baseValue: 0, alternativeValue: 0 };
    }
    const baseValue = kpiFormulas[key](baseMetrics);
    const alternativeValue = kpiFormulas[key](alternativeMetrics);
    
    return {
        key,
        name: kpiNames[key] || key,
        baseValue,
        alternativeValue
    };
  });

  return results;
}

/**
 * =================================================================
 * Пример вызова модуля с демонстрационными данными
 * =================================================================
 */
export function runDemo() {
    // 1. Исходные данные
    const demoBaseMetrics: BaseMetrics = {
        traffic: 10000,
        conversionRate: 0.05, // 5%
        avgOrderValue: 1500,
        costs: 200000,
    };

    // 2. Альтернативный сценарий: +20% трафика, -10% затрат
    const demoScenario: Scenario = {
        traffic: 1.20, // +20%
        costs: 0.90,   // -10%
    };

    // 3. Список KPI для расчёта
    const kpisToCalculate = ['revenue', 'profit', 'roi', 'cpa'];
    
    // 4. Вызов модуля
    const comparisonResults = calculateKpis(demoBaseMetrics, demoScenario, kpisToCalculate);

    // 5. Вывод результатов в консоль
    console.log("--- Демонстрация работы модуля расчёта KPI ---");
    console.log("Базовые метрики:", demoBaseMetrics);
    console.log("Сценарий:", { traffic: "+20%", costs: "-10%" });
    console.log("\n--- Результаты сравнения ---");
    comparisonResults.forEach(res => {
        console.log(
            `${res.name}: \n` +
            `  Базовый: ${res.baseValue.toFixed(2)}\n` +
            `  Альтернативный: ${res.alternativeValue.toFixed(2)}\n`
        );
    });
    console.log("------------------------------------------");

    return comparisonResults;
}

// Вы можете раскомментировать следующую строку, чтобы увидеть
// результаты демонстрационного запуска в консоли разработчика
// runDemo();