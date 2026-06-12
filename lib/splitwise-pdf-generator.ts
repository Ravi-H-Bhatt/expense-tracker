import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = {
  primary: [4, 120, 87] as [number, number, number],      // emerald-700
  secondary: [16, 185, 129] as [number, number, number],  // emerald-500
  accent: [14, 165, 233] as [number, number, number],     // sky-500
  bg: [236, 253, 245] as [number, number, number],        // emerald-50
  text: [15, 23, 42] as [number, number, number],         // slate-900
  textLight: [71, 85, 105] as [number, number, number],   // slate-600
  success: [5, 150, 105] as [number, number, number],     // emerald-600
  danger: [225, 29, 72] as [number, number, number],      // rose-600
  white: [255, 255, 255] as [number, number, number]
};

interface MemberExpense {
  name: string;
  paid: number;
  owes: number;
  net: number;
}

interface MonthlyGroupData {
  month: string;
  totalExpenses: number;
  totalAmount: number;
  memberCount: number;
}

export class SplitwisePDFGenerator {
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

  private addPage() {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  private checkPageBreak(neededSpace: number) {
    if (this.currentY + neededSpace > this.pageHeight - this.margin) {
      this.addPage();
      return true;
    }
    return false;
  }

  private drawHeader(title: string, subtitle: string) {
    this.doc.setFillColor(...COLORS.primary);
    this.doc.rect(0, 0, this.pageWidth, 50, 'F');

    this.doc.setTextColor(...COLORS.white);
    this.doc.setFontSize(28);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.pageWidth / 2, 22, { align: 'center' });

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(subtitle, this.pageWidth / 2, 35, { align: 'center' });

    this.currentY = 60;
  }

  private drawInfoBox(label: string, value: string, x: number, y: number, width: number, color: number[] = COLORS.bg as any) {
    this.doc.setFillColor(...(color as [number, number, number]));
    this.doc.setDrawColor(...COLORS.secondary);
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(x, y, width, 22, 3, 3, 'FD');

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.textLight);
    this.doc.text(label, x + 5, y + 8);

    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.primary);
    this.doc.text(value, x + 5, y + 17);
  }

  private drawSectionHeader(title: string, _icon?: string) {
    this.checkPageBreak(20);

    this.doc.setFillColor(...COLORS.primary);
    this.doc.roundedRect(this.margin, this.currentY - 1, 3, 7, 1, 1, 'F');

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.text);
    this.doc.text(title, this.margin + 6, this.currentY + 5);

    this.doc.setDrawColor(...COLORS.secondary);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY + 7, this.pageWidth - this.margin, this.currentY + 7);

    this.currentY += 15;
  }

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

  private drawProgressBar(label: string, percentage: number, amount: string, y: number, color: [number, number, number] = COLORS.primary) {
    const barWidth = this.pageWidth - 2 * this.margin - 60;
    const barHeight = 8;
    const startX = this.margin + 60;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.text);
    this.doc.text(label, this.margin, y + 5);

    this.doc.setFillColor(230, 230, 230);
    this.doc.roundedRect(startX, y, barWidth, barHeight, 2, 2, 'F');

    const fillWidth = (barWidth * Math.min(percentage, 100)) / 100;
    this.doc.setFillColor(...color);
    this.doc.roundedRect(startX, y, fillWidth, barHeight, 2, 2, 'F');

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.primary);
    this.doc.text(`${percentage.toFixed(1)}%`, startX + barWidth + 3, y + 5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(amount, startX + barWidth + 15, y + 5);
  }

  private drawMiniBarChart(data: { label: string; value: number; max: number; color?: [number, number, number] }[], title: string) {
    this.checkPageBreak(60);
    this.drawSectionHeader(title);

    data.forEach((item, index) => {
      const y = this.currentY + index * 12;
      this.drawProgressBar(
        item.label, 
        (item.value / item.max) * 100, 
        this.formatCurrency(item.value), 
        y,
        item.color || COLORS.primary
      );
    });

    this.currentY += data.length * 12 + 10;
  }

  private formatCurrency(amount: number): string {
    return `Rs. ${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  private addFooters(reportType: string) {
    const pageCount = this.doc.internal.pages.length - 1;
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      this.doc.setDrawColor(...COLORS.secondary);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);

      this.doc.setFontSize(8);
      this.doc.setTextColor(...COLORS.textLight);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`Page ${i} of ${pageCount}`, this.margin, this.pageHeight - 10);
      this.doc.text(
        `RFin ${reportType} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );
      this.doc.text('Confidential', this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
    }
  }

  // Generate Monthly Group Report
  generateMonthlyGroupReport(data: {
    groupName: string;
    month: string;
    year: string;
    expenses: any[];
    members: MemberExpense[];
    totalSpent: number;
    groupFund: number;
    categoryBreakdown: { category: string; amount: number }[];
  }) {
    this.drawHeader('Group Expense Report', `${data.groupName}`);

    // Period info
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.primary);
    this.doc.text(`Period: ${data.month} ${data.year}`, this.margin, this.currentY);
    this.currentY += 7;
    
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.textLight);
    this.doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })}`, this.margin, this.currentY);
    this.currentY += 15;

    // Summary boxes
    const boxWidth = (this.pageWidth - 2 * this.margin - 15) / 4;
    this.drawInfoBox('Members', data.members.length.toString(), this.margin, this.currentY, boxWidth);
    this.drawInfoBox('Expenses', data.expenses.length.toString(), this.margin + boxWidth + 5, this.currentY, boxWidth);
    this.drawInfoBox('Total Spent', this.formatCurrency(data.totalSpent), this.margin + 2 * (boxWidth + 5), this.currentY, boxWidth);
    this.drawInfoBox('Group Fund', this.formatCurrency(data.groupFund), this.margin + 3 * (boxWidth + 5), this.currentY, boxWidth, [200, 255, 220]);
    this.currentY += 30;

    // Member contribution analysis
    if (data.members.length > 0) {
      const maxPaid = Math.max(...data.members.map(m => m.paid));
      const memberData = data.members
        .sort((a, b) => b.paid - a.paid)
        .map(m => ({
          label: m.name.length > 15 ? m.name.substring(0, 15) + '...' : m.name,
          value: m.paid,
          max: maxPaid,
          color: m.paid > 0 ? COLORS.success : COLORS.textLight
        }));

      this.drawMiniBarChart(memberData, 'Member Contributions (Who Paid)');
    }

    // Member balance sheet with visual indicators
    if (data.members.length > 0) {
      this.checkPageBreak(40);
      this.drawSectionHeader('Balance Sheet', '💰');

      const balanceData = data.members.map(m => {
        const status = m.net === 0 ? '✓ Settled' : m.net > 0 ? `↑ Gets Back` : `↓ Owes`;
        return [
          m.name,
          this.formatCurrency(m.paid),
          this.formatCurrency(m.owes),
          this.formatCurrency(Math.abs(m.net)),
          status
        ];
      });

      this.drawTable(
        ['Member', 'Paid', 'Owes', 'Net Balance', 'Status'],
        balanceData,
        {
          0: { halign: 'left', cellWidth: 45 },
          1: { halign: 'right', cellWidth: 35, textColor: COLORS.success },
          2: { halign: 'right', cellWidth: 35, textColor: COLORS.danger },
          3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
          4: { halign: 'center', cellWidth: 30 }
        }
      );
    }

    // Category breakdown
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

      // Detailed category table
      this.drawTable(
        ['Category', 'Amount', 'Percentage'],
        data.categoryBreakdown.map(c => [
          c.category,
          this.formatCurrency(c.amount),
          `${((c.amount / data.totalSpent) * 100).toFixed(1)}%`
        ]),
        {
          0: { halign: 'left', cellWidth: 90 },
          1: { halign: 'right', cellWidth: 50, fontStyle: 'bold' },
          2: { halign: 'right', cellWidth: 40 }
        }
      );
    }

    // Expense details with who paid
    if (data.expenses.length > 0) {
      this.checkPageBreak(40);
      this.drawSectionHeader('Expense Details', '📝');

      const expenseData = data.expenses.map(e => [
        new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        e.description.length > 35 ? e.description.substring(0, 35) + '...' : e.description,
        e.is_group_fund_expense ? 'Group Fund' : (e.paid_by_name || 'Unknown'),
        this.formatCurrency(Number(e.total_amount))
      ]);

      this.drawTable(
        ['Date', 'Description', 'Paid By', 'Amount'],
        expenseData,
        {
          0: { halign: 'center', cellWidth: 25 },
          1: { halign: 'left', cellWidth: 80 },
          2: { halign: 'left', cellWidth: 35 },
          3: { halign: 'right', cellWidth: 30, fontStyle: 'bold', textColor: COLORS.primary }
        }
      );
    }

    this.addFooters('Group Report');
    return this.doc;
  }

  // Generate Yearly Group Report
  generateYearlyGroupReport(data: {
    groupName: string;
    year: string;
    monthlyData: MonthlyGroupData[];
    members: MemberExpense[];
    totalExpenses: number;
    totalAmount: number;
    categoryBreakdown: { category: string; amount: number }[];
  }) {
    this.drawHeader('Annual Group Report', `${data.groupName} - ${data.year}`);

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.textLight);
    this.doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { 
      year: 'numeric', month: 'long', day: 'numeric'
    })}`, this.margin, this.currentY);
    this.currentY += 15;

    // Annual summary
    const boxWidth = (this.pageWidth - 2 * this.margin - 15) / 4;
    this.drawInfoBox('Members', data.members.length.toString(), this.margin, this.currentY, boxWidth);
    this.drawInfoBox('Expenses', data.totalExpenses.toString(), this.margin + boxWidth + 5, this.currentY, boxWidth);
    this.drawInfoBox('Total Amount', this.formatCurrency(data.totalAmount), this.margin + 2 * (boxWidth + 5), this.currentY, boxWidth);
    this.drawInfoBox('Monthly Avg', this.formatCurrency(data.totalAmount / 12), this.margin + 3 * (boxWidth + 5), this.currentY, boxWidth);
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

    // Annual member contributions
    if (data.members.length > 0) {
      const maxPaid = Math.max(...data.members.map(m => m.paid));
      this.drawMiniBarChart(
        data.members.sort((a, b) => b.paid - a.paid).map(m => ({
          label: m.name,
          value: m.paid,
          max: maxPaid,
          color: COLORS.success
        })),
        'Annual Member Contributions'
      );
    }

    // Category analysis
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

    this.addFooters('Annual Group Report');
    return this.doc;
  }

  save(filename: string) {
    this.doc.save(filename);
  }
}

export default SplitwisePDFGenerator;
