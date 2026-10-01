import React, { useState } from 'react';
import { openPdfWhatsApp, pdfDraftMessage, printMatchingPdf } from '../../lib/printPdf.js';

export default function PdfSaveActions({ phone, customerName, storeName, orderNumber, share = false, blocked = '', onRetry }) {
  const [busy, setBusy] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState(() => pdfDraftMessage({ customerName, storeName, orderNumber }));
  const save = async () => {
    setBusy(true); setFailed(false);
    try {
      await printMatchingPdf();
      setPrinted(true);
      setFeedback('Print / Save as PDF requested. Choose Save as PDF and save the file. This app cannot confirm whether you saved or cancelled.');
    } catch {
      setFailed(true); setFeedback('Could not open Print / Save as PDF. Please try again.');
    } finally { setBusy(false); }
  };
  return <section className="print:hidden p-4 border rounded-xl bg-slate-50 space-y-3" aria-label="Save matching PDF">
    <p className="text-sm">To save the exact print layout, use the print dialog and choose Save as PDF. A file does not download automatically.{share && ' Then open WhatsApp and manually attach the saved PDF. Nothing is attached or sent automatically.'}</p>
    {blocked && <p role="alert" className="text-rose-700">{blocked} {onRetry && <button onClick={onRetry} className="underline">Retry prescription</button>}</p>}
    <button disabled={busy || !!blocked} onClick={save} className="px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-50">{busy ? 'Preparing print…' : 'Print / Save as PDF'}</button>
    {share && <>
      <label className="block text-sm">WhatsApp message<textarea className="block w-full p-2 border rounded-lg" value={message} onChange={e => setMessage(e.target.value)} /></label>
      <button disabled={!printed || !!blocked} className="px-4 py-2 rounded-xl bg-emerald-700 text-white disabled:opacity-50" onClick={() => {
        try {
          openPdfWhatsApp(phone, message);
          setFailed(false); setFeedback('WhatsApp draft opened. Manually attach your saved PDF, review the message and press Send in WhatsApp.');
        } catch (err) { setFailed(true); setFeedback(err.message); }
      }}>I saved the PDF — Open WhatsApp draft</button>
    </>}
    {feedback && <p role={failed ? 'alert' : 'status'} className={failed ? 'text-rose-700 text-sm' : 'text-emerald-800 text-sm'}>{feedback}</p>}
  </section>;
}
