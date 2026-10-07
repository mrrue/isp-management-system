import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { Printer, Download, CheckCircle, Smartphone, Send, MessageSquare } from 'lucide-react';
import jsPDF from 'jspdf';
import { useAuth } from '../../context/AuthContext';

export default function ReceiptModal({ isOpen, onClose, receiptData }) {
  const { formatCurrency, settings: authSettings } = useAuth();
  const [paperSize, setPaperSize] = useState('80mm'); // '58mm' or '80mm'
  const receiptRef = useRef(null);

  if (!receiptData) return null;

  const { payment, settings: dataSettings } = receiptData;
  const biz = dataSettings?.business_info || authSettings?.business_info || {};
  const rCfg = dataSettings?.receipt_settings || authSettings?.receipt_settings || {
    receipt_title: 'PAYMENT RECEIPT',
    size: '80mm',
    header_text: 'HIGH SPEED FIBER BROADBAND',
    footer_text: 'Thank you for your payment!\nKeep this slip for your record.',
    show_logo: true,
    show_customer_id: true,
    show_customer_phone: true,
    show_customer_address: true,
    show_package: true,
    show_billing_period: true,
    show_payment_method: true,
    show_collector: true
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    let rawPhone = payment.customer_phone || '';
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    
    if (!cleanPhone) {
      alert('No customer phone number available for WhatsApp.');
      return;
    }

    const bizName = biz.name || 'ISP NETWORK';
    const message = 
`🧾 *${bizName.toUpperCase()} - PAYMENT RECEIPT*
━━━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${payment.customer_name || 'Valued Customer'}
🆔 *Customer ID:* ${payment.customer_code || 'N/A'}
🔢 *Receipt No:* ${payment.receipt_number}
📅 *Date:* ${payment.payment_date || ''}
🌐 *Package:* ${payment.package_name || 'Broadband Plan'}
🗓️ *Billing Period:* ${payment.billing_period || 'Current Month'}
💳 *Payment Mode:* ${payment.payment_method || 'Cash'}
${payment.reference_number ? `🔖 *Ref/Tx ID:* ${payment.reference_number}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━
💰 *PAID AMOUNT: ${formatCurrency(payment.amount)}*
${payment.current_balance > 0 ? `⚠️ *Remaining Balance:* ${formatCurrency(payment.current_balance)}\n` : '✅ *Account Status:* Paid / Cleared\n'}━━━━━━━━━━━━━━━━━━━━━━
${payment.collector_name ? `👨‍💼 *Received by:* ${payment.collector_name}\n` : ''}${biz.phone ? `📞 *Helpline:* ${biz.phone}\n` : ''}Thank you for your valued business!`;

    const encodedMsg = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    window.open(waUrl, '_blank');
  };

  const handleDownloadPDF = () => {
    const is58 = paperSize === '58mm';
    const width = is58 ? 58 : 80;
    const doc = new jsPDF({
      unit: 'mm',
      format: [width, 180]
    });

    let y = 8;
    const centerX = width / 2;
    const margin = 4;
    const rightX = width - margin;

    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.text(biz.name || 'ISP NETWORK', centerX, y, { align: 'center' });
    y += 5;

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    if (biz.address) {
      const splitAddr = doc.splitTextToSize(biz.address, width - 8);
      doc.text(splitAddr, centerX, y, { align: 'center' });
      y += (splitAddr.length * 3.5);
    }
    if (biz.phone) {
      doc.text(`Phone: ${biz.phone}`, centerX, y, { align: 'center' });
      y += 4;
    }

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, y, rightX, y);
    y += 4;

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.text(rCfg.receipt_title || 'RECEIPT', centerX, y, { align: 'center' });
    y += 5;

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.text(`Rec No: ${payment.receipt_number}`, margin, y);
    y += 4;
    doc.text(`Date: ${payment.payment_date}`, margin, y);
    y += 5;

    doc.line(margin, y, rightX, y);
    y += 4;

    const addRow = (label, val) => {
      if (!val) return;
      doc.setFont('courier', 'bold');
      doc.text(`${label}:`, margin, y);
      doc.setFont('courier', 'normal');
      doc.text(String(val), rightX, y, { align: 'right' });
      y += 4.5;
    };

    if (rCfg.show_customer_id) addRow('Cust ID', payment.customer_code);
    addRow('Customer', payment.customer_name);
    if (rCfg.show_customer_phone) addRow('Phone', payment.customer_phone);
    if (rCfg.show_package) addRow('Package', payment.package_name);
    if (rCfg.show_billing_period) addRow('Period', payment.billing_period);
    if (rCfg.show_payment_method) addRow('Method', payment.payment_method);
    if (payment.reference_number) addRow('Ref No', payment.reference_number);

    doc.line(margin, y, rightX, y);
    y += 5;

    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text('AMOUNT PAID:', margin, y);
    doc.text(formatCurrency(payment.amount), rightX, y, { align: 'right' });
    y += 6;

    if (rCfg.show_collector && payment.collector_name) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Received by: ${payment.collector_name}`, margin, y);
      y += 5;
    }

    doc.line(margin, y, rightX, y);
    y += 4;

    if (rCfg.footer_text) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      const splitFooter = doc.splitTextToSize(rCfg.footer_text, width - 8);
      doc.text(splitFooter, centerX, y, { align: 'center' });
    }

    doc.save(`${payment.receipt_number}.pdf`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Receipt" maxWidth="max-w-md">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 no-print">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setPaperSize('58mm')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${paperSize === '58mm' ? 'bg-white shadow-xs text-sky-700' : 'text-slate-600'}`}
          >
            58mm Thermal
          </button>
          <button
            onClick={() => setPaperSize('80mm')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${paperSize === '80mm' ? 'bg-white shadow-xs text-sky-700' : 'text-slate-600'}`}
          >
            80mm Standard
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            title="Send Receipt via WhatsApp"
          >
            <Smartphone className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Printable Receipt Layout */}
      <div className="py-6 flex justify-center bg-slate-100/50 rounded-xl my-3">
        <div
          ref={receiptRef}
          id="receipt-print-area"
          className={`bg-white p-5 shadow-sm border border-slate-200 text-slate-900 font-mono ${paperSize === '58mm' ? 'receipt-58mm w-[58mm] text-[11px]' : 'receipt-80mm w-[80mm] text-[12px]'}`}
        >
          {/* Header */}
          <div className="text-center pb-2 border-b border-dashed border-slate-400">
            <h2 className="font-bold text-sm uppercase tracking-wide text-slate-900">{biz.name || 'APEX FASTNET BROADBAND'}</h2>
            {biz.tagline && <p className="text-[10px] text-slate-600 italic">{biz.tagline}</p>}
            {biz.address && <p className="text-[10px] text-slate-700 mt-1 leading-tight">{biz.address}</p>}
            {biz.phone && <p className="text-[10px] font-semibold text-slate-800 mt-0.5">Phone: {biz.phone}</p>}
            {biz.whatsapp && <p className="text-[10px] text-slate-700">WhatsApp: {biz.whatsapp}</p>}
          </div>

          <div className="text-center py-1.5 font-bold uppercase tracking-wider text-xs border-b border-dashed border-slate-400">
            {rCfg.receipt_title || 'PAYMENT RECEIPT'}
          </div>

          {/* Receipt Meta */}
          <div className="py-2 text-[11px] border-b border-dashed border-slate-400 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Receipt No:</span>
              <span className="font-bold">{payment.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Date & Time:</span>
              <span>{payment.payment_date}</span>
            </div>
          </div>

          {/* Customer Details */}
          <div className="py-2 text-[11px] border-b border-dashed border-slate-400 space-y-1">
            {rCfg.show_customer_id && (
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Customer ID:</span>
                <span className="font-bold">{payment.customer_code}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Name:</span>
              <span className="font-bold">{payment.customer_name}</span>
            </div>
            {rCfg.show_customer_phone && payment.customer_phone && (
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Phone:</span>
                <span>{payment.customer_phone}</span>
              </div>
            )}
            {rCfg.show_customer_address && payment.customer_address && (
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-600 font-medium">Address:</span>
                <span className="text-right max-w-[65%]">{payment.customer_address}</span>
              </div>
            )}
          </div>

          {/* Subscription & Payment Info */}
          <div className="py-2 text-[11px] border-b border-dashed border-slate-400 space-y-1">
            {rCfg.show_package && payment.package_name && (
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Package:</span>
                <span className="font-semibold">{payment.package_name} ({payment.package_speed})</span>
              </div>
            )}
            {rCfg.show_billing_period && (
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Billing Period:</span>
                <span className="font-bold">{payment.billing_period}</span>
              </div>
            )}
            {rCfg.show_payment_method && (
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Payment Mode:</span>
                <span>{payment.payment_method}</span>
              </div>
            )}
            {payment.reference_number && (
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Ref / Tx ID:</span>
                <span>{payment.reference_number}</span>
              </div>
            )}
          </div>

          {/* Amount Box */}
          <div className="py-2.5 my-1 border-b-2 border-dashed border-slate-900 flex justify-between items-center text-sm font-bold">
            <span>PAID AMOUNT:</span>
            <span className="text-base">{formatCurrency(payment.amount)}</span>
          </div>

          {payment.current_balance > 0 && (
            <div className="py-1 text-[11px] flex justify-between text-rose-600 font-bold border-b border-dashed border-slate-400">
              <span>Remaining Balance:</span>
              <span>{formatCurrency(payment.current_balance)}</span>
            </div>
          )}

          {rCfg.show_collector && (
            <div className="py-1.5 text-[10px] text-slate-600">
              <span>Received by: </span>
              <span className="font-semibold text-slate-800">{payment.collector_name || 'Accounts Staff'}</span>
            </div>
          )}

          {/* Footer Text */}
          <div className="pt-2 text-center text-[10px] text-slate-600 leading-tight">
            <p className="whitespace-pre-line">{rCfg.footer_text || 'Thank you for your payment!'}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
