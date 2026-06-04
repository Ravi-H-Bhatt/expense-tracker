import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Brand colors
const COLORS = {
  primary: [139, 69, 19] as [number, number, number],
  secondary: [212, 149, 106] as [number, number, number],
  accent: [240, 192, 112] as [number, number, number],
  bg: [255, 243, 205] as [number, number, number],
  text: [26, 18, 8] as [number, number, number],
  textLight: [107, 87, 68] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  white: [255, 255, 255] as [number, number, number]
};

interface MonthlyData {
  month: string;
  totalExpenses: number;
  totalAmount: number;
  categories: { [key: string]: number };
}

export class EnhancedPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  // Add new page with header
  private addPage() {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  // Check if we need new page
  private checkPageBreak(neededSpace: number) {
    if (this.currentY + neededSpace > this.pageHeight - this.margin) {
      this.addPage();
      return true;
    }
    return false;
  }

  // Draw header
  private drawHeader(title: string, subtitle: string) {
    // Background gradient effect
    this.doc.setFillColor(...COLORS.primary);
    this.doc.rect(0, 0, this.pageWidth, 50, 'F');

    // Title
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFontSize(28);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.pageWidth / 2, 22, { align: 'center' });

    // Subtitle
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(subtitle, this.pageWidth / 2, 35, { align: 'center' });

    this.currentY = 60;
  }

  // Draw info box
  private drawInfoBox(label: string, value: string, x: number, y: number, width: number) {
    // Main box
    this.doc.setFillColor(...COLORS.bg);
    this.doc.setDrawColor(...COLORS.secondary);
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(x, y, width, 22, 3, 3, 'FD');

    // Label
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.textLight);
    this.doc.text(label, x + 5, y + 8);

    // Value
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.primary);
    this.doc.text(value, x + 5, y + 17);
  }

  // Draw section header
  private drawSectionHeader(title: string, icon: string = '📊') {
    this.checkPageBreak(20);

    // Title with icon
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.text);
    this.doc.text(`${icon} ${title}`, this.margin, this.currentY + 5);

    // Underline
    this.doc.setDrawColor(...COLORS.secondary);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY + 7, this.pageWidth - this.margin, this.currentY + 7);

    this.currentY += 15;
  }

  // Draw fancy table
  private drawTable(headers: string[], data: any[][], columnStyles: any = {}) {
    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 5
      },
      bodyStyles: {
        textColor: COLORS.text,
        fontSize: 10,
        cellPadding: 4
      },
      alternateRowStyles: {
        fillColor: [250, 245, 240]
      },
      columnStyles: {
        ...columnStyles
      },
      margin: { left: this.margin, right: this.margin },
      didDrawPage: (data) => {
        this.currentY = (data as any).cursor?.y || this.currentY;
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private drawProgressBar(label: string, percentage: number, amount: string, y: number) {
    const barWidth = this.pageWidth - 2 * this.margin - 60;
    const barHeight = 8;
    const startX = this.margin + 60;

    // Label
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.text);
    this.doc.text(label, this.margin, y + 5);

    // Background bar
    this.doc.setFillColor(230, 230, 230);
    this.doc.roundedRect(startX, y, barWidth, barHeight, 2, 2, 'F');

    // Progress bar
    const fillWidth = (barWidth * percentage) / 100;
    const color: [number, number, number] = percentage > 66 ? COLORS.success : percentage > 33 ? [245, 158, 11] : COLORS.danger;
    this.doc.setFillColor(...color);
    this.doc.roundedRect(startX, y, fillWidth, barHeight, 2, 2, 'F');

    // Percentage and amount
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.primary);
    this.doc.text(`${percentage.toFixed(1)}%`, startX + barWidth + 3, y + 5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(amount, startX + barWidth + 15, y + 5);
  }

  // Draw mini chart (text-based)
  private drawMiniBarChart(data: { label: string; value: number; max: number }[], title: string) {
    this.checkPageBreak(60);
    this.drawSectionHeader(title, '📈');

    data.forEach((item, index) => {
      const y = this.currentY + index * 12;
      this.drawProgressBar(item.label, (item.value / item.max) * 100, `₹${item.value.toLocaleString('en-IN')}`, y);
    });

    this.currentY += data.length * 12 + 10;
  }

  // Format currency
  private formatCurrency(amount: number): string {
    return `₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  // Add footer to all pages
  private addFooters(reportType: string) {
    const pageCount = this.doc.internal.pages.length - 1;
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Footer line
      this.doc.setDrawColor(...COLORS.secondary);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);

      // Footer text
      this.doc.setFontSize(8);
      this.doc.setTextColor(...COLORS.textLight);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.margin,
        this.pageHeight - 10
      );
      this.doc.text(
        `RFin ${reportType} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );
      this.doc.text(
        'Confidential',
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      );
    }
  }

  // Generate Personal Expense Report (Monthly)
  generatePersonalMonthlyReport(data: {
    userName: string;
    month: string;
    year: string;
    expenses: any[];
    totalAmount: number;
    categoryBreakdown: { category: string; amount: number; count: number }[];
    paymentMethodBreakdown: { method: string; amount: number; count: number }[];
  }) {
    this.drawHeader('Personal Expense Report', `${data.month} ${data.year}`);

    // User info and generation date
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.primary);
    this.doc.text(`Report for: ${data.userName}`, this.margin, this.currentY);
    this.currentY += 7;
    
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.textLight);
    this.doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })}`, this.margin, this.currentY);
    this.currentY += 15;

    // Summary boxes
    const boxWidth = (this.pageWidth - 2 * this.margin - 10) / 3;
    this.drawInfoBox('Total Expenses', data.expenses.length.toString(), this.margin, this.currentY, boxWidth);
    this.drawInfoBox('Total Amount', this.formatCurrency(data.totalAmount), this.margin + boxWidth + 5, this.currentY, boxWidth);
    this.drawInfoBox('Avg per Expense', this.formatCurrency(data.totalAmount / data.expenses.length), this.margin + 2 * (boxWidth + 5), this.currentY, boxWidth);
    this.currentY += 30;

    // Category breakdown with chart
    if (data.categoryBreakdown.length > 0) {
      const maxCategory = Math.max(...data.categoryBreakdown.map(c => c.amount));
      this.drawMiniBarChart(
        data.categoryBreakdown.slice(0, 6).map(c => ({
          label: c.category,
          value: c.amount,
          max: maxCategory
        })),
        'Spending by Category'
      );

      // Detailed table
      this.drawTable(
        ['Category', 'Count', 'Amount', '%'],
        data.categoryBreakdown.map(c => [
          c.category,
          c.count.toString(),
          this.formatCurrency(c.amount),
          `${((c.amount / data.totalAmount) * 100).toFixed(1)}%`
        ]),
        {
          0: { halign: 'left', cellWidth: 60 },
          1: { halign: 'center', cellWidth: 30 },
          2: { halign: 'right', cellWidth: 50, fontStyle: 'bold' },
          3: { halign: 'right', cellWidth: 30 }
        }
      );
    }

    // Payment method breakdown
    if (data.paymentMethodBreakdown.length > 0) {
      this.checkPageBreak(60);
      const maxPayment = Math.max(...data.paymentMethodBreakdown.map(p => p.amount));
      this.drawMiniBarChart(
        data.paymentMethodBreakdown.map(p => ({
          label: p.method,
          value: p.amount,
          max: maxPayment
        })),
        'Payment Methods'
      );
    }

    // Expense details
    if (data.expenses.length > 0) {
      this.checkPageBreak(40);
      this.drawSectionHeader('Expense Details', '📝');

      const expenseData = data.expenses.map(e => [
        new Date(e.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        e.category,
        e.notes ? (e.notes.length > 40 ? e.notes.substring(0, 40) + '...' : e.notes) : '-',
        e.payment_method || '-',
        this.formatCurrency(Number(e.amount))
      ]);

      this.drawTable(
        ['Date', 'Category', 'Notes', 'Payment', 'Amount'],
        expenseData,
        {
          0: { halign: 'center', cellWidth: 25 },
          1: { halign: 'left', cellWidth: 35 },
          2: { halign: 'left', cellWidth: 55 },
          3: { halign: 'center', cellWidth: 30 },
          4: { halign: 'right', cellWidth: 30, fontStyle: 'bold', textColor: COLORS.primary }
        }
      );
    }

    this.addFooters('Expense Report');
    return this.doc;
  }

  // Generate Personal Expense Report (Yearly)
  generatePersonalYearlyReport(data: {
    userName: string;
    year: string;
    monthlyData: MonthlyData[];
    totalExpenses: number;
    totalAmount: number;
    categoryBreakdown: { category: string; amount: number; count: number }[];
  }) {
    this.drawHeader('Annual Expense Report', data.year);

    // User info
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.primary);
    this.doc.text(`Report for: ${data.userName}`, this.margin, this.currentY);
    this.currentY += 15;

    // Yearly summary
    const boxWidth = (this.pageWidth - 2 * this.margin - 10) / 3;
    this.drawInfoBox('Total Expenses', data.totalExpenses.toString(), this.margin, this.currentY, boxWidth);
    this.drawInfoBox('Total Amount', this.formatCurrency(data.totalAmount), this.margin + boxWidth + 5, this.currentY, boxWidth);
    this.drawInfoBox('Monthly Avg', this.formatCurrency(data.totalAmount / 12), this.margin + 2 * (boxWidth + 5), this.currentY, boxWidth);
    this.currentY += 35;

    // Monthly trend
    const maxMonthly = Math.max(...data.monthlyData.map(m => m.totalAmount));
    this.drawMiniBarChart(
      data.monthlyData.map(m => ({
        label: m.month.substring(0, 3),
        value: m.totalAmount,
        max: maxMonthly
      })),
      'Monthly Spending Trend'
    );

    // Category summary for year
    if (data.categoryBreakdown.length > 0) {
      const maxCategory = Math.max(...data.categoryBreakdown.map(c => c.amount));
      this.drawMiniBarChart(
        data.categoryBreakdown.slice(0, 8).map(c => ({
          label: c.category,
          value: c.amount,
          max: maxCategory
        })),
        'Annual Category Breakdown'
      );
    }

    // Monthly breakdown table
    this.checkPageBreak(60);
    this.drawSectionHeader('Month-by-Month Summary', '📅');

    const monthlyTableData = data.monthlyData.map(m => [
      m.month,
      m.totalExpenses.toString(),
      this.formatCurrency(m.totalAmount),
      this.formatCurrency(m.totalExpenses > 0 ? m.totalAmount / m.totalExpenses : 0)
    ]);

    this.drawTable(
      ['Month', 'Expenses', 'Total Amount', 'Avg/Expense'],
      monthlyTableData,
      {
        0: { halign: 'left', cellWidth: 40 },
        1: { halign: 'center', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 50, fontStyle: 'bold' },
        3: { halign: 'right', cellWidth: 45 }
      }
    );

    this.addFooters('Annual Report');
    return this.doc;
  }

  // Save PDF
  save(filename: string) {
    this.doc.save(filename);
  }
}

export default EnhancedPDFGenerator;
