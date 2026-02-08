// PDF Invoice Generator for Brothers Solar
// Using jsPDF library for PDF generation

// Load jsPDF library (will be loaded from CDN)
function loadPDFLibrary() {
    return new Promise((resolve, reject) => {
        if (window.jspdf) {
            resolve(window.jspdf.jsPDF);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve(window.jspdf.jsPDF);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Generate PDF Invoice
async function generatePDFInvoice(orderData) {
    try {
        const jsPDF = await loadPDFLibrary();
        const doc = new jsPDF();
        
        // PDF Content
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPosition = margin;
        
        // Header
        doc.setFontSize(24);
        doc.setTextColor(30, 81, 40); // Green color
        doc.text('Brothers Solar', pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 15;
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text('Solar Energy Solutions', pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 20;
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('TAX INVOICE', pageWidth / 2, yPosition, { align: 'center' });
        
        // Invoice Details
        yPosition += 20;
        doc.setFontSize(10);
        doc.text(`Invoice #: ${orderData.orderId}`, margin, yPosition);
        doc.text(`Date: ${new Date().toLocaleDateString('hi-IN')}`, pageWidth - margin, yPosition, { align: 'right' });
        
        // Customer Details
        yPosition += 20;
        doc.setFontSize(12);
        doc.text('Bill To:', margin, yPosition);
        yPosition += 10;
        doc.setFontSize(10);
        doc.text(orderData.name, margin, yPosition);
        yPosition += 6;
        doc.text(orderData.address, margin, yPosition);
        yPosition += 6;
        doc.text(`Phone: ${orderData.phone}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Email: ${orderData.email}`, margin, yPosition);
        
        // Order Details Table
        yPosition += 20;
        doc.setFontSize(12);
        doc.text('Order Details:', margin, yPosition);
        
        yPosition += 10;
        // Table headers
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');
        doc.text('Description', margin + 5, yPosition + 7);
        doc.text('Quantity', margin + 80, yPosition + 7);
        doc.text('Unit Price', margin + 120, yPosition + 7);
        doc.text('Total', margin + 160, yPosition + 7);
        
        yPosition += 10;
        // Table content
        doc.text(orderData.solarType, margin + 5, yPosition + 7);
        doc.text(orderData.quantity.toString(), margin + 80, yPosition + 7);
        doc.text(`₹${orderData.price.toLocaleString('hi-IN')}`, margin + 120, yPosition + 7);
        doc.text(`₹${orderData.totalAmount.toLocaleString('hi-IN')}`, margin + 160, yPosition + 7);
        
        // Total
        yPosition += 20;
        doc.setFontSize(12);
        doc.text(`Total Amount: ₹${orderData.totalAmount.toLocaleString('hi-IN')}`, margin, yPosition);
        
        // Payment Details
        yPosition += 20;
        doc.text(`Payment Method: ${orderData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Installation Date: ${orderData.installationDate}`, margin, yPosition);
        
        // Footer
        yPosition += 30;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Thank you for choosing Brothers Solar!', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 5;
        doc.text('This is a computer generated invoice.', pageWidth / 2, yPosition, { align: 'center' });
        
        // Save the PDF
        const filename = `Brothers_Solar_Invoice_${orderData.orderId}.pdf`;
        doc.save(filename);
        
        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        return false;
    }
}

// Add download invoice button to order confirmation
function addInvoiceDownloadButton(orderData) {
    const installationSection = document.getElementById('installation-section');
    if (!installationSection) return;
    
    const invoiceButton = document.createElement('button');
    invoiceButton.className = 'btn btn-success mt-3';
    invoiceButton.innerHTML = '<i class="fas fa-file-pdf"></i> Download Invoice';
    invoiceButton.onclick = async () => {
        invoiceButton.disabled = true;
        invoiceButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        const success = await generatePDFInvoice(orderData);
        
        if (success) {
            invoiceButton.innerHTML = '<i class="fas fa-check"></i> Invoice Downloaded';
            invoiceButton.className = 'btn btn-outline-success mt-3';
        } else {
            invoiceButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error Generating PDF';
            invoiceButton.className = 'btn btn-danger mt-3';
            setTimeout(() => {
                invoiceButton.disabled = false;
                invoiceButton.innerHTML = '<i class="fas fa-file-pdf"></i> Download Invoice';
                invoiceButton.className = 'btn btn-success mt-3';
            }, 3000);
        }
    };
    
    installationSection.querySelector('.result-box').appendChild(invoiceButton);
}

// Export functions
window.PDFInvoice = {
    generatePDFInvoice,
    addInvoiceDownloadButton
};
