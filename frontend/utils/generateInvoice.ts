import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CartItem } from '@/types/cart'

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
    }
  }
}

export async function generateInvoicePDF(
  items: CartItem[],
  total: number,
  userEmail: string | null,
  firstName: string
): Promise<Blob> {
  const doc = new jsPDF()

  const logo = new Image()
  logo.src = '/Brand-Logo/coveLogo.png'
  await new Promise((resolve) => {
    logo.onload = resolve
  })

  doc.addImage(logo, 'PNG', 150, 10, 40, 15)

  doc.setFontSize(24)
  doc.setTextColor(30, 30, 30)
  doc.text('COVE', 14, 20)
  doc.setFontSize(14)
  doc.setTextColor(90)
  doc.text('Official Purchase Invoice', 14, 28)

  doc.setFontSize(11)
  doc.setTextColor(0)
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36)
  if (userEmail) doc.text(`Customer Email: ${userEmail}`, 14, 42)

  const message = `Dear ${firstName},

Thank you for shopping with Cove.
We hope you love what you've ordered!
Your style matters, and we're proud to be a part of it.
For any help, our support team is always here for you.`

  const wrapped = doc.splitTextToSize(message, 180)
  doc.setFontSize(10)
  doc.setTextColor(50)
  doc.text(wrapped, 14, 52)

  autoTable(doc, {
    startY: 52 + wrapped.length * 5 + 5,
    head: [['Image', 'Item', 'Material', 'Size', 'Color', 'Qty', 'Price/Unit (€)']],
    body: items.map((item) => [
      'IMAGE',
      item.name,
      item.material || '-',
      item.size,
      item.colorName,
      item.quantity.toString(),
      item.price.toFixed(2)
    ]) as string[][],
    didDrawCell: (data) => {
      if (data.column.index === 0 && data.cell.section === 'body') {
        const imageIndex = data.row.index
        const imageUrl = items[imageIndex]?.imageUrl
        if (imageUrl) {
          const img = new Image()
          img.src = imageUrl
          img.onload = () => {
            doc.addImage(img, 'JPEG', data.cell.x + 2, data.cell.y + 2, 16, 16)
          }
        }
      }
    },
    styles: { fontSize: 9, cellPadding: 4, valign: 'middle' },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 45 },
      2: { cellWidth: 40 }
    }
  })

  doc.setFontSize(12)
  doc.setTextColor(0)
  doc.text(`Total Amount: € ${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 12)

  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('This is a computer-generated invoice from www.wearkove.com', 14, doc.lastAutoTable.finalY + 25)

  // ✅ Return the Blob instead of saving
  const pdfBlob = doc.output('blob')
  return pdfBlob
}
