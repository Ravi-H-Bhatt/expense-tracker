import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExpenseData {
  id: string;
  description: string;
  total_amount: number;
  paid_by_name: string;
  is_group_fund_expense: boolean;
  created_at: string;
}

interface MemberBalance {
  name: string;
  paid: number;
  owes: number;
  net: number;
}

interface ReportData {
  groupName: string;
  month: string;
  year: string;
  expenses: ExpenseData[];
  members: MemberBalance[];
  totalSpent: number;
  groupFund: number;
  categoryBreakdown: { category: string; amount: number }[];
}

export function generateMonthlyReport(data: ReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header with styling
  doc.setFillColor(139, 69, 19); // #8B4513
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('RFin Monthly Report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.groupName}`, pageWidth / 2, 32, { align: 'center' });
  
  yPos = 50;

  // Report period
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Report Period: ${data.month} ${data.year}`, 14, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 14, yPos + 7);
  
  yPos += 20;

  // Summary boxes
  doc.setFillColor(255, 243, 205); // Light yellow
  doc.roundedRect(14, yPos, 85, 25, 3, 3, 'F');
  doc.roundedRect(104, yPos, 85, 25, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(107, 87, 68);
  doc.text('Total Expenses', 18, yPos + 8);
  doc.text('Group Fund Balance', 108, yPos + 8);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text(`₹${data.totalSpent.toLocaleString('en-IN')}`, 18, yPos + 19);
  doc.text(`₹${data.groupFund.toLocaleString('en-IN')}`, 108, yPos + 19);
  
  yPos += 35;

  // Member balances table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Member Balances', 14, yPos);
  yPos += 5;

  const balanceData = data.members.map(m => [
    m.name,
    `₹${m.paid.toLocaleString('en-IN')}`,
    `₹${m.owes.toLocaleString('en-IN')}`,
    m.net === 0 ? 'Settled' : `${m.net > 0 ? '+' : ''}₹${Math.abs(m.net).toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Member', 'Paid', 'Owes', 'Net Balance']],
    body: balanceData,
    theme: 'grid',
    headStyles: { 
      fillColor: [139, 69, 19],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: { 
      textColor: [26, 18, 8],
      halign: 'right'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 60 },
      1: { cellWidth: 40 },
      2: { cellWidth: 40 },
      3: { cellWidth: 45, fontStyle: 'bold' }
    },
    alternateRowStyles: { fillColor: [245, 239, 230] },
    margin: { left: 14, right: 14 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Category breakdown
  if (data.categoryBreakdown.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Spending by Category', 14, yPos);
    yPos += 5;

    const categoryData = data.categoryBreakdown.map(c => [
      c.category,
      `₹${c.amount.toLocaleString('en-IN')}`,
      `${((c.amount / data.totalSpent) * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Amount', 'Percentage']],
      body: categoryData,
      theme: 'grid',
      headStyles: { 
        fillColor: [139, 69, 19],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { 
        textColor: [26, 18, 8]
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 90 },
        1: { halign: 'right', cellWidth: 50 },
        2: { halign: 'right', cellWidth: 45 }
      },
      alternateRowStyles: { fillColor: [245, 239, 230] },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Expense details
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Expense Details', 14, yPos);
  yPos += 5;

  const expenseData = data.expenses.map(e => [
    new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    e.description,
    e.is_group_fund_expense ? 'Group Fund' : e.paid_by_name,
    `₹${Number(e.total_amount).toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Description', 'Paid By', 'Amount']],
    body: expenseData,
    theme: 'grid',
    headStyles: { 
      fillColor: [139, 69, 19],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: { 
      textColor: [26, 18, 8],
      fontSize: 9
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 },
      1: { halign: 'left', cellWidth: 80 },
      2: { halign: 'left', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
    },
    alternateRowStyles: { fillColor: [245, 239, 230] },
    margin: { left: 14, right: 14 }
  });

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(107, 87, 68);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount} | RFin Expense Tracker | Confidential`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `${data.groupName.replace(/[^a-z0-9]/gi, '_')}_${data.month}_${data.year}.pdf`;
  doc.save(fileName);
}
