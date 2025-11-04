// This service relies on `jsPDF` and `html2canvas` being available in the global scope,
// as they are loaded via CDN in index.html.

// FIX: Import React to use React.createElement and fix JSX-related parsing issues in a .ts file.
import React from 'react';
import type { Kpi } from '../App';
// FIX: Import icon components to be used with React.createElement.
import { 
    DollarSignIcon, 
    ShoppingCartIcon, 
    UsersIcon, 
    MousePointerClickIcon, 
    ClipboardListIcon 
} from '../components/icons';

// Add type declarations to satisfy TypeScript, since we don't have the types installed.
// We'll access them via the window object to be safe inside a module.
declare global {
    interface Window {
        html2canvas: any;
        jspdf: any;
    }
}

export interface ReportData {
  title: string;
  kpis: {
    label: string;
    value: string | number;
    change: string;
    icon: React.ReactElement;
  }[];
  chartData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  };
}


/**
 * Generates a PDF from a specified HTML element and triggers a download.
 * @param elementId The ID of the HTML element to capture.
 * @param fileName The desired name for the downloaded PDF file.
 */
export async function generatePdf(elementId: string, fileName: string): Promise<void> {
  const reportElement = document.getElementById(elementId);

  if (!reportElement) {
    throw new Error(`Element with id "${elementId}" not found.`);
  }
  
  // Ensure libraries are loaded
  if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
      console.error("jsPDF or html2canvas not loaded. Check the script tags in index.html.");
      throw new Error("PDF generation library not available.");
  }

  // Use html2canvas to render the element into a canvas
  const canvas = await window.html2canvas(reportElement, {
    scale: 2, // Improve resolution
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  // Get the image data from the canvas
  const imgData = canvas.toDataURL('image/png');

  // Create a new jsPDF instance (A4 size, portrait)
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Calculate image dimensions to fit the A4 page
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(imgData);
  const imgRatio = imgProps.height / imgProps.width;
  const imgHeight = pdfWidth * imgRatio;

  let finalHeight = imgHeight;
  let finalWidth = pdfWidth;

  // If the image is too tall, scale it down to fit the page height
  if (imgHeight > pdfHeight) {
    finalHeight = pdfHeight;
    finalWidth = pdfHeight / imgRatio;
  }
  
  // Add the image to the PDF
  pdf.addImage(imgData, 'PNG', 0, 0, finalWidth, finalHeight);

  // Save the PDF and trigger download
  pdf.save(fileName);
}

/**
 * Generates a PDF from a Markdown string and triggers a download.
 * @param markdown The Markdown content to include in the PDF.
 * @param title The title of the document.
 * @param fileName The desired name for the downloaded PDF file.
 */
export async function generatePdfFromMarkdown(markdown: string, title: string, fileName: string): Promise<void> {
    // Ensure library is loaded
    if (typeof window.jspdf === 'undefined') {
        console.error("jsPDF not loaded. Check the script tags in index.html.");
        throw new Error("PDF generation library not available.");
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const maxLineWidth = pageWidth - margin * 2;
    let cursorY = 20;

    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text(title, margin, cursorY);
    cursorY += 15;

    const lines = markdown.split('\n');

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');

    for (const line of lines) {
        if (cursorY > 280) { // New page
            pdf.addPage();
            cursorY = 20;
        }

        if (line.startsWith('## ') || line.startsWith('### ')) {
            pdf.setFont(undefined, 'bold');
            pdf.setFontSize(14);
            const headerText = line.startsWith('## ') ? line.substring(3) : line.substring(4);
            const splitHeader = pdf.splitTextToSize(headerText.trim(), maxLineWidth);
            pdf.text(splitHeader, margin, cursorY);
            cursorY += (Array.isArray(splitHeader) ? splitHeader.length : 1) * 6 + 3;
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(11);
        } else if (line.match(/^\s*-\s\*\*(.*?)\*\*:/)) {
            const match = line.match(/^\s*-\s\*\*(.*?)\*\*:(.*)/);
            if (match) {
                const boldPart = `• ${match[1]}:`;
                const normalPart = match[2].trim();
                
                pdf.setFont(undefined, 'bold');
                pdf.text(boldPart, margin, cursorY);
                
                const boldPartWidth = pdf.getTextWidth(boldPart);
                pdf.setFont(undefined, 'normal');
                const splitNormal = pdf.splitTextToSize(normalPart, maxLineWidth - boldPartWidth - 2);
                pdf.text(splitNormal, margin + boldPartWidth + 1, cursorY);

                cursorY += (Array.isArray(splitNormal) ? splitNormal.length : 1) * 5;

            }
        } else if (line.startsWith('- ')) {
            const itemText = `• ${line.substring(2)}`;
            const splitItem = pdf.splitTextToSize(itemText, maxLineWidth);
            pdf.text(splitItem, margin, cursorY);
            cursorY += (Array.isArray(splitItem) ? splitItem.length : 1) * 5;
        } else if (line.trim() === '') {
            cursorY += 5;
        } else {
             if (line.startsWith('# ')) continue; // Ignore top-level H1
            const splitLine = pdf.splitTextToSize(line, maxLineWidth);
            pdf.text(splitLine, margin, cursorY);
            cursorY += (Array.isArray(splitLine) ? splitLine.length : 1) * 5;
        }
    }

    pdf.save(fileName);
}


export function generateReportData(reportType: string, dateRange: { start: Date, end: Date }): ReportData {
    // FIX: Replace JSX with React.createElement to avoid syntax errors in a .ts file.
    const kpiMap: Record<string, Partial<Kpi>> = {
        revenue: { id: "revenue", title: "Выручка", value: "", change: 0, changeType: "week", icon: React.createElement(DollarSignIcon), category: 'Финансы' },
        sales: { id: "sales", title: "Продажи", value: "", change: 0, changeType: "week", icon: React.createElement(ShoppingCartIcon), category: 'Маркетинг' },
        new_clients: { id: "new_clients", title: "Новые клиенты", value: "", change: 0, changeType: "week", icon: React.createElement(UsersIcon), category: 'Клиенты' },
        conversion: { id: "conversion", title: "Конверсия", value: "", change: 0, changeType: "week", icon: React.createElement(MousePointerClickIcon), category: 'Маркетинг' },
        employee_turnover: { id: "employee_turnover", title: "Текучесть кадров", value: "", change: 0, changeType: "month", icon: React.createElement(UsersIcon), category: 'HR' },
        ticket_resolution_time: { id: "ticket_resolution_time", title: "Время решения тикета", value: "", change: 0, changeType: "week", icon: React.createElement(ClipboardListIcon), category: 'Разработка' },
    };

    const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const reportConfigs: Record<string, { title: string; kpiIds: string[]; chartBase: number }> = {
        financial: { title: "Финансовый отчет", kpiIds: ['revenue', 'sales'], chartBase: 100000 },
        sales: { title: "Отчет по продажам", kpiIds: ['sales', 'new_clients', 'conversion'], chartBase: 500 },
        marketing: { title: "Маркетинговый отчет", kpiIds: ['new_clients', 'conversion'], chartBase: 100 },
        kpi_summary: { title: "Сводка KPI", kpiIds: Object.keys(kpiMap), chartBase: 1000 },
    };

    const config = reportConfigs[reportType] || reportConfigs.kpi_summary;

    const generatedKpis = config.kpiIds.map(id => {
        const baseValue = Math.random() * 5000 + 1000;
        const change = (Math.random() - 0.5) * 20; // -10% to +10%
        return {
            label: kpiMap[id]?.title || 'Unknown KPI',
            value: baseValue.toFixed(0),
            change: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
            // FIX: Replace JSX with React.createElement for the fallback icon.
            icon: kpiMap[id]?.icon || React.createElement('div'),
        };
    });

    const labels = Array.from({ length: Math.min(diffDays, 30) }, (_, i) => {
        const date = new Date(dateRange.start);
        date.setDate(date.getDate() + i);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    });

    const datasets = config.kpiIds.slice(0, 2).map(id => ({
        label: kpiMap[id]?.title || 'KPI',
        data: Array.from({ length: labels.length }, () => Math.random() * config.chartBase * 1.5 + config.chartBase / 2),
    }));

    // FIX: Add missing return statement to satisfy the function's return type.
    return {
        title: config.title,
        kpis: generatedKpis,
        chartData: { labels, datasets },
    };
}


/**
 * Generates a CSV file from report data and triggers a download.
 * @param data The report data to export.
 * @param fileName The desired name for the downloaded CSV file.
 */
export function generateCsv(data: ReportData, fileName: string): void {
  if (!data || !data.kpis) {
    console.error("No data provided for CSV generation.");
    return;
  }

  const headers = ['Показатель', 'Значение', 'Изменение'];
  const rows = data.kpis.map(kpi => [
    `"${kpi.label.replace(/"/g, '""')}"`, // Escape double quotes
    String(kpi.value),
    `"${String(kpi.change).replace(/"/g, '""')}"`
  ]);

  let csvContent = headers.join(',') + '\n';
  csvContent += rows.map(row => row.join(',')).join('\n');

  // Add BOM for Excel compatibility with Cyrillic characters
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
