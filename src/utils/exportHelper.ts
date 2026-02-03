import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { type Transaction } from '../services/firebaseService'; // Adjust path if needed

export const exportTransactionsToExcel = async (transactions: Transaction[], fileName: string) => {
  // 1. Create a new Workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transactions');

  // 2. Define Columns
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Payment Method', key: 'paymentMethod', width: 20 },
  ];

  // 3. Add Rows
  transactions.forEach(t => {
    // Convert Firestore Timestamp to readable string if needed
    const dateStr = t.timestamp?.toDate ? t.timestamp.toDate().toLocaleDateString() : new Date().toLocaleDateString();
    
    worksheet.addRow({
      date: dateStr,
      description: t.description,
      type: t.type,
      amount: t.amount,
      category: t.category || 'Misc',
      paymentMethod: t.paymentMethod || 'Other'
    });
  });

  // 4. Style the Header (Optional but nice)
  worksheet.getRow(1).font = { bold: true };
  
  // 5. Generate Buffer & Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
};