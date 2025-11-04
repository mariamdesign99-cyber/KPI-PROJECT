// --- DATA SIMULATION & ANALYSIS MODULE ---

export interface AnalysisResult {
  data: number[];
  trend: {
    line: number[];
    description: string;
  };
  forecast: {
    values: number[];
    description: string;
  };
  drivers: string[];
}

/**
 * Generates realistic-looking mock time-series data for a KPI.
 * @param kpiId - The ID of the KPI (e.g., 'revenue', 'sales').
 * @param days - The number of historical data points to generate.
 * @returns An array of numbers representing the KPI value over time.
 */
export function generateMockKpiData(kpiId: string, days: number = 90): number[] {
  const data = [];
  let baseValue = 1000;
  let trend = 0.5;
  
  // Customize behavior based on KPI
  switch (kpiId) {
    case 'revenue':
      baseValue = 50000;
      trend = 250; // Positive trend
      break;
    case 'sales':
      baseValue = 800;
      trend = 10;
      break;
    case 'new_clients':
        baseValue = 150;
        trend = -0.5; // Slight negative trend
        break;
    case 'conversion':
        baseValue = 4.5;
        trend = 0.005;
        return Array.from({length: days}, (_, i) => {
            const seasonal = Math.sin((i % 7) * (Math.PI / 3.5)) * 0.2; // Weekly seasonality
            const noise = (Math.random() - 0.5) * 0.1;
            return Math.max(2.0, baseValue + i * trend + seasonal + noise);
        });
  }

  for (let i = 0; i < days; i++) {
    // Add seasonality (e.g., weekly pattern)
    const seasonal = Math.sin((i % 7) * (Math.PI / 3.5)) * (baseValue * 0.1);
    // Add some random noise
    const noise = (Math.random() - 0.5) * (baseValue * 0.05);
    const value = baseValue + i * trend + seasonal + noise;
    data.push(Math.max(0, value)); // Ensure value is not negative
  }

  return data;
}

/**
 * Performs a simple linear regression to find the trend line.
 * @param data - Array of historical data points.
 * @returns An object with the trend line and a text description.
 */
function detectTrend(data: number[]): { line: number[], description: string } {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const line = data.map((_, i) => slope * i + intercept);
    
    let description = "стабильный";
    if (slope > data[0] * 0.005) description = "умеренный рост";
    if (slope > data[0] * 0.015) description = "уверенный рост";
    if (slope < -data[0] * 0.005) description = "небольшое снижение";
    if (slope < -data[0] * 0.015) description = "существенное снижение";

    return { line, description };
}

/**
 * Creates a simple forecast based on the detected trend.
 * @param data - Array of historical data points.
 * @param trendLine - The calculated trend line.
 * @param periods - How many periods to forecast into the future.
 * @returns An object with forecasted values and a text description.
 */
function createForecast(data: number[], trendLine: number[], periods: number = 7): { values: number[], description: string } {
    const n = data.length;
    const lastTrendValue = trendLine[n - 1];
    const slope = trendLine[n - 1] - trendLine[n - 2];
    
    const values = [];
    for (let i = 1; i <= periods; i++) {
        // Simple projection + seasonality from the previous week
        const seasonalComponent = data[n - (periods - i) -1] - trendLine[n - (periods - i) -1];
        values.push(lastTrendValue + slope * i + seasonalComponent);
    }
    
    const firstForecast = values[0];
    const lastForecast = values[values.length - 1];
    const avgForecast = (firstForecast + lastForecast) / 2;
    const description = `прогнозируется значение в районе ${avgForecast.toFixed(0)}`;

    return { values, description };
}

/**
 * Simulates identification of likely drivers for KPI changes.
 * @param kpiId - The ID of the KPI.
 * @param trendDescription - The description of the detected trend.
 * @returns An array of plausible driver strings.
 */
function identifyDrivers(kpiId: string, trendDescription: string): string[] {
    const positiveDrivers: { [key: string]: string[] } = {
        revenue: ["Новая маркетинговая кампания", "Сезонный спрос", "Увеличение среднего чека"],
        sales: ["Запуск промо-акции", "Рост трафика из соц. сетей", "Улучшение UX на сайте"],
        new_clients: ["Успешная PR-активность", "Реферальная программа", "Снижение стоимости привлечения"],
        conversion: ["Оптимизация воронки продаж", "A/B тесты на странице оплаты", "Улучшение скорости сайта"]
    };
    const negativeDrivers: { [key:string]: string[] } = {
        revenue: ["Снижение рекламного бюджета", "Технические проблемы на сайте", "Активность конкурентов"],
        sales: ["Неудачная акция", "Падение органического трафика"],
        new_clients: ["Негативные отзывы", "Рост стоимости привлечения (CPA)"],
        conversion: ["Баг в корзине", "Сложная форма регистрации"]
    };

    const drivers = trendDescription.includes("рост") 
        ? positiveDrivers[kpiId] 
        : trendDescription.includes("снижение")
        ? negativeDrivers[kpiId]
        : [...positiveDrivers[kpiId], ...negativeDrivers[kpiId]];

    // Return 2 random drivers from the list
    return drivers.sort(() => 0.5 - Math.random()).slice(0, 2);
}


/**
 * Main function to orchestrate the AI analysis process.
 * @param data - The historical data for the KPI.
 * @returns A comprehensive analysis result object.
 */
export function performAiAnalysis(data: number[], kpiId: string = 'revenue'): AnalysisResult {
    const trend = detectTrend(data);
    const forecast = createForecast(data, trend.line);
    const drivers = identifyDrivers(kpiId, trend.description);

    return {
        data,
        trend,
        forecast,
        drivers
    };
}
