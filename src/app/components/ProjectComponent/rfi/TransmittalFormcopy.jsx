'use client';

import React, { useRef, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import useDrawingStore from '../../../../src/stores/useDrawingStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TransmittalForm = () => {
  const { approvedDrawings } = useDrawingStore();

  // Modal state for viewing attachments
  const [showModal, setShowModal] = useState(false);
  const [modalFiles, setModalFiles] = useState([]);
  const [modalDrawingNo, setModalDrawingNo] = useState('');

  // Date logic from HybridPublishDrawings
  const today = new Date().toISOString().slice(0, 10);

  // Map approvedDrawings to the table format you need, with date logic
  const drawings = approvedDrawings.map((d, i) => {
    const rev = d.rev || '';
    const isNumericRev = /^\d+$/.test(rev);
    const isAlphaRev = /^[a-zA-Z]+$/.test(rev);

    return {
      id: i + 1,
      desc: d.itemName || d.item || '-',
      drawingNo: d.drawingNo || d.drgNo || '-',
      rev: rev,
      dateSentForApproval: isAlphaRev ? today : (d.approvalDate || d.dateSentForApproval || ''),
      dateReceivedBFA: d.bfaDate || '',
      dateSentForFab: isNumericRev ? today : (d.fabDate || d.dateSentForFab || ''),
      remark: d.remark || (d.void ? 'For Approval [VOID]' : 'For Approval'),
      void: d.void || false,
      detailer: d.detailer || 'AHE',
      checker: d.checker || 'SOH',
      sheetSize: d.sheetSize || (i === 3 || i === 4 ? '18x24' : '11x17'),
      itemQty: i === 0 || i === 2 ? '2' : i === 1 ? '1' : '1', // Default to 1
      attachedPdfs: d.attachedPdfs || [],
    };
  });

  // Refs for header info
  const jobNoRef = useRef();
  const coordinatorRef = useRef();
  const solJobNoRef = useRef();
  const fabricatorNameRef = useRef();
  const teamLeaderRef = useRef();
  const zipNameRef = useRef(); // ADD THIS REF

  // Download handler
  const handleDownload = () => {
    // --- Get header info values from refs ---
    const fabricatorJobNo = jobNoRef.current?.value || '';
    const fabricatorCoordinator = coordinatorRef.current?.value || '';
    const solJobNo = solJobNoRef.current?.value || '';
    const fabricatorName = fabricatorNameRef.current?.value || '';
    const solTeamLeader = teamLeaderRef.current?.value || '';
    const zipName = zipNameRef.current?.value || ''; // GET ZIP NAME HERE

    // --- Calculate COUNT of drawings for "WE ARE SENDING YOU" section ---
    let newItemForApprovalQty = 0;
    let newItemForFabFieldQty = 0;
    let deletedItemQty = 0;
    let revisedItemForApprovalQty = 0; // Placeholder for future logic
    let revisedItemForFabFieldQty = 0; // Placeholder for future logic

    drawings.forEach(d => {
      // Check if dates are present and not empty
      const hasDateSentForApproval = d.dateSentForApproval && d.dateSentForApproval.trim() !== '';
      const hasDateSentForFab = d.dateSentForFab && d.dateSentForFab.trim() !== '';

      if (d.void) {
        deletedItemQty++; // Increment count by 1
      } else if (hasDateSentForApproval) {
        newItemForApprovalQty++; // Increment count by 1
      } else if (hasDateSentForFab) {
        newItemForFabFieldQty++; // Increment count by 1
      }
    });

    // The total is simply the total number of drawing rows
    const totalQty = drawings.length;


    // --- PDF EXPORT ---
    const doc = new jsPDF('p', 'pt', 'a4');
    let y = 40;

    // --- Letterhead ---
    doc.setFontSize(14);
    doc.text('STRUCTURES ONLINE', 40, y);
    doc.setFontSize(10);
    doc.text('C 56A/27, Sec-62, Noida-201307', 40, y + 15);
    doc.text('Tel:+911202403056, www.structuresonline.net', 40, y + 30);
    doc.text('E:mail: mahesh_teli@sol-mail.net', 40, y + 45);

    // --- Title ---
    doc.setFontSize(16);
    doc.text('LETTER OF TRANSMITTAL', 350, y + 10);

    // --- Header Info Block from Form Inputs ---
    y += 80;
    const todayDate = new Date();
    const formattedDate = `${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}-${todayDate.getFullYear()}`;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Left column of header
    doc.text(`TO: ${fabricatorName}`, 40, y);
    doc.text(`ATTN: ${fabricatorCoordinator}`, 40, y + 15);
    doc.text(`PROJECT NAME: Oppidan - Reno Data Center`, 40, y + 30); // Hardcoded, can be made dynamic

    // Right column of header
    doc.text(`DATE: ${formattedDate}`, 350, y);
    doc.text(`TRANSMITTAL NO: 002`, 350, y + 15); // Hardcoded, can be made dynamic
    doc.text(`FABRICATOR JOB NO: ${fabricatorJobNo}`, 350, y + 30);
    doc.text(`ISSUED BY: ${solTeamLeader}`, 350, y + 45);
    doc.text(`SEQUENCE NO:`, 350, y + 60); // Hardcoded, can be made dynamic
    doc.text(`SOL JOB NO: ${solJobNo}`, 350, y + 75);

    // --- "WE ARE SENDING YOU" Checklist Block ---
    y += 100;
    doc.setFontSize(10);
    doc.text('WE ARE SENDING YOU:', 40, y);
    y += 15;
    doc.text('Drg Qty.', 60, y);
    doc.text('Drg Qty.', 370, y);
    y += 15;

    // Left column checklist
    doc.text(`[${newItemForApprovalQty > 0 ? 'X' : ' '}]`, 40, y);
    doc.text(`${newItemForApprovalQty}`, 60, y);
    doc.text('NEW ITEM FOR APPROVAL', 90, y);
    y += 15;
    doc.text(`[${newItemForFabFieldQty > 0 ? 'X' : ' '}]`, 40, y);
    doc.text(`${newItemForFabFieldQty}`, 60, y);
    doc.text('NEW ITEM FOR FAB/FIELD', 90, y);
    y += 15;
    doc.text(`[${deletedItemQty > 0 ? 'X' : ' '}]`, 40, y);
    doc.text(`${deletedItemQty}`, 60, y);
    doc.text('DELETED ITEM', 90, y);

    // Reset Y for the right column to align
    y -= 30;

    // Right column checklist
    doc.text(`[${revisedItemForApprovalQty > 0 ? 'X' : ' '}]`, 350, y);
    doc.text(`${revisedItemForApprovalQty}`, 370, y);
    doc.text('REVISED ITEM FOR APPROVAL', 400, y);
    y += 15;
    doc.text(`[${revisedItemForFabFieldQty > 0 ? 'X' : ' '}]`, 350, y);
    doc.text(`${revisedItemForFabFieldQty}`, 370, y);
    doc.text('REVISED ITEM FOR FAB/FIELD', 400, y);
    y += 15;
    doc.text('Total', 350, y);
    doc.text(`${totalQty}`, 400, y);

    // --- TRANSMITTAL REMARK Block ---
    y += 40; // Add some vertical space after the previous section
    const remarkRectX = 35;
    const remarkRectY = y;
    const remarkRectWidth = 520;
    const remarkTitleHeight = 20; // Height for the "TRANSMITTAL REMARK" title row
    const remarkContentHeight = 30; // Height for the content row (can be adjusted)

    // Outer rectangle (main box)
    doc.setDrawColor(0); // Black border
    doc.rect(remarkRectX, remarkRectY, remarkRectWidth, remarkTitleHeight + remarkContentHeight);

    // Inner line (separating title from content)
    doc.line(remarkRectX, remarkRectY + remarkTitleHeight, remarkRectX + remarkRectWidth, remarkRectY + remarkTitleHeight);

    // Transmittal Remark Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSMITTAL REMARK', remarkRectX + (remarkRectWidth / 2), remarkRectY + (remarkTitleHeight / 2) + 4, { align: 'center' }); // Centered

    // Transmittal Remark Content (Zip Name)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    // Using `text` with alignment to fit text within the box, wrapping if necessary.
    // For a single line, you might just use doc.text(zipName, remarkRectX + 5, remarkRectY + remarkTitleHeight + (remarkContentHeight / 2) + 3);
    // If you need actual text wrapping for longer text, you'd use doc.splitTextToSize
    // For now, let's assume it fits or is okay to overflow slightly
    doc.text(zipName, remarkRectX + 5, remarkRectY + remarkTitleHeight + (remarkContentHeight / 2) + 3);

    y = remarkRectY + remarkTitleHeight + remarkContentHeight; // Update Y position after this block

    // --- Drawings Table ---
    y += 20; // Add space before the table

    // Group by description
    const grouped = {};
    drawings.forEach(item => {
      const desc = item.void ? `${item.desc} [VOID]` : item.desc;
      if (!grouped[desc]) grouped[desc] = [];
      grouped[desc].push(item.drawingNo);
    });

    const pdfTableHeaders = [['REV. REMARK', 'SHEET TITLE', 'SHEET NAME', 'SHEET QTY']];
    const pdfTableData = Object.entries(grouped).map(([desc, drawingNos]) => [
      'ISSUED FOR APPROVAL',
      desc,
      drawingNos.join(', '),
      drawingNos.length
    ]);

    autoTable(doc, {
      startY: y,
      head: pdfTableHeaders,
      body: pdfTableData,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [0, 112, 192] },
      theme: 'grid'
    });

    doc.save('Transmittal.pdf');
  };

  // Modal open/close handlers
  const handleViewAttachment = useCallback((drawing) => {
    setModalFiles(drawing.attachedPdfs || []);
    setModalDrawingNo(drawing.drawingNo);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalFiles([]);
    setModalDrawingNo('');
  }, []);

  return (
    <div className="p-6 text-gray-800 space-y-4">
      <h1 className="text-center font-bold text-xl">Prada @ Forum Shops Project</h1>

      {/* Header Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <label>FABRICATOR JOB NO.:</label>
          <input ref={jobNoRef} className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label>FABRICATOR CO-ORDINATOR:</label>
          <input ref={coordinatorRef} className="border w-full px-2 py-1 rounded font-semibold" />
        </div>
        <div>
          <label>SOL JOB NO:</label>
          <input ref={solJobNoRef} className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label>FABRICATOR NAME:</label>
          <input ref={fabricatorNameRef} className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label>SOL Team Leader:</label>
          <input ref={teamLeaderRef} className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label>Transmittal Name:</label>
          <input className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label>Submittal Name:</label>
          <input className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label>Zip Name:</label>
          <input ref={zipNameRef} className="border w-full px-2 py-1 rounded" /> {/* ATTACH REF HERE */}
        </div>
        <div>
          <label>Complete Name:</label>
          <input className="border w-full px-2 py-1 rounded" />
        </div>
      </div>

      {/* Drawing Table */}
      <div className='overflow-x-auto border rounded mb-6'>
        <table className="w-full text-sm">
          <thead className="bg-cyan-800 text-white text-left">
            <tr>
              {[
                'S.No',
                'Description',
                'Drawing No',
                'Rev',
                'Date Sent for Approval',
                'Date Received BFA',
                'Date Sent For Fab./Field',
                'Remark',
                'Detailer',
                'Checker',
                'Sheet Size',
                'Item Qty',
                'Attachment'
              ].map(header => (
                <th key={header} className="p-4">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drawings.map((item, i) => (
              <tr key={item.id} className={item.void ? 'bg-red-200' : ''}>
                <td className="p-2 text-center">{i + 1}</td>
                <td className="p-2">{item.void ? `${item.desc} [VOID]` : item.desc}</td>
                <td className="p-2 text-center">{item.drawingNo}</td>
                <td className="p-2 text-center">{item.rev}</td>
                <td className="p-2 text-center">{item.dateSentForApproval}</td>
                <td className="p-2 text-center">{item.dateReceivedBFA}</td>
                <td className="p-2 text-center">{item.dateSentForFab}</td>
                <td className="p-2">{item.remark}</td>
                <td className="p-2 text-center">{item.detailer}</td>
                <td className="p-2 text-center">{item.checker}</td>
                <td className="p-2 text-center">{item.sheetSize}</td>
                <td className="p-2 text-center">{item.itemQty}</td>
                <td className="p-2 text-center">
                  {item.attachedPdfs && item.attachedPdfs.length > 0 ? (
                    <span
                      className="text-blue-500 underline cursor-pointer"
                      onClick={() => handleViewAttachment(item)}
                    >
                      View
                    </span>
                  ) : (
                    ''
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Checkboxes */}
      <div className="flex flex-wrap items-center gap-4 text-sm mt-4">
        <label className="flex items-center gap-1"><input type="checkbox" /> Include Item Qty</label>
        <label className="flex items-center gap-1"><input type="checkbox" /> Allow to send cad pdf's</label>
        <label className="flex items-center gap-1"><input type="checkbox" /> Transmittal Log</label>
        <label className="flex items-center gap-1"><input type="checkbox" /> Submittal Log</label>
        <label className="flex items-center gap-1"><input type="checkbox" /> Complete Log</label>
        <label className="flex items-center gap-1"><input type="checkbox" /> Don't send mails</label>
      </div>

      {/* Remarks Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div>
          <label className="text-sm">Subject:</label>
          <textarea className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="text-sm">Mail Text:</label>
          <textarea className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="text-sm">Transmittal Remark:</label>
          <textarea className="w-full border p-2 rounded" />
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <button className="bg-teal-800 text-white px-4 py-2 rounded text-sm hover:bg-teal-900">Publish</button>
        <button className="bg-teal-800 text-white px-4 py-2 rounded text-sm hover:bg-teal-900">Save</button>
        <button className="bg-teal-800 text-white px-4 py-2 rounded text-sm hover:bg-teal-900" onClick={handleDownload}>Download</button>
        <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Back For Correction</button>
      </div>

      {/* Attachment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white border rounded-md w-[600px] p-4 shadow-lg relative">
            <button
              onClick={closeModal}
              className="absolute top-0 right-0 bg-red-600 text-white px-2 py-1 text-xs rounded-bl-md"
            >
              ✕
            </button>
            <h2 className="font-bold mb-2">Attachments for Drawing {modalDrawingNo}</h2>
            <table className="w-full border">
              <thead>
                <tr className="bg-cyan-800 text-white text-sm">
                  <th className="p-2 text-left font-semibold">Name</th>
                  <th className="p-2 text-left font-semibold">Download</th>
                </tr>
              </thead>
              <tbody>
                {modalFiles.map((file, idx) => (
                  <tr key={file.name || idx} className="border-t text-sm">
                    <td className="p-2">{file.name}</td>
                    <td className="p-2">
                      <button
                        className="text-blue-600 underline"
                        onClick={() => {
                          const blobOrFile = file.file || file;
                          if (blobOrFile) {
                            const url = URL.createObjectURL(blobOrFile);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = file.name;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }
                        }}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4">
              <button onClick={closeModal} className="bg-gray-400 text-white px-4 py-1 text-sm rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransmittalForm;