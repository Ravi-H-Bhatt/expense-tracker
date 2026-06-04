import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PersonalExpense {
  id: string;
  amount: number;
  category: string;
  notes?: string;
  payment_method?: string;
  expense_date: string;
}

interface PersonalReportData {
  userName: string;
  month: string;
  year: string;
  expenses: PersonalExpense[];
  totalAmount: number;
  categoryBreakdown: { category: string; amount: number; count: number }[];
  paymentMethodBreakdown: { method: string; amount: number; count: number }[];
}

export function generatePersonalExpenseReport(data: PersonalReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  doc.setFillColor(139, 69, 19);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Personal Expense Report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.userName, pageWidth / 2, 32, { align: 'center' });
  
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
  doc.setFillColor(255, 243, 205);
  doc.roundedRect(14, yPos, 85, 25, 3, 3, 'F');
  doc.roundedRect(104, yPos, 85, 25, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(107, 87, 68);
  doc.text('Total Expenses', 18, yPos + 8);
  doc.text('Total Amount', 108, yPos + 8);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text(data.expenses.length.toString(), 18, yPos + 19);
  doc.text(`₹${data.totalAmount.toLocaleString('en-IN')}`, 108, yPos + 19);
  
  yPos += 35;

  // Category breakdown
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Spending by Category', 14, yPos);
  yPos += 5;

  const categoryData = data.categoryBreakdown.map(c => [
    c.category,
    c.count.toString(),
    `₹${c.amount.toLocaleString('en-IN')}`,
    `${((c.amount / data.totalAmount) * 100).toFixed(1)}%`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Count', 'Amount', 'Percentage']],
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
      0: { halign: 'left', cellWidth: 60 },
      1: { halign: 'center', cellWidth: 35 },
      2: { halign: 'right', cellWidth: 50 },
      3: { halign: 'right', cellWidth: 40 }
    },
    alternateRowStyles: { fillColor: [245, 239, 230] },
    margin: { left: 14, right: 14 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Payment method breakdown
  if (data.paymentMethodBreakdown.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Methods', 14, yPos);
    yPos += 5;

    const paymentData = data.paymentMethodBreakdown.map(p => [
      p.method || 'Not Specified',
      p.count.toString(),
      `₹${p.amount.toLocaleString('en-IN')}`,
      `${((p.amount / data.totalAmount) * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Payment Method', 'Count', 'Amount', 'Percentage']],
      body: paymentData,
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
        0: { halign: 'left', cellWidth: 60 },
        1: { halign: 'center', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 50 },
        3: { halign: 'right', cellWidth: 40 }
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
    new Date(e.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    e.category,
    e.notes || '-',
    e.payment_method || '-',
    `₹${Number(e.amount).toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Category', 'Notes', 'Payment', 'Amount']],
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
      fontSize: 8
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 25 },
      1: { halign: 'left', cellWidth: 30 },
      2: { halign: 'left', cellWidth: 50 },
      3: { halign: 'left', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
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
  const fileName = `Personal_Expenses_${data.month}_${data.year}.pdf`;
  doc.save(fileName);
}
