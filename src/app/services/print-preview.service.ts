import { Injectable } from '@angular/core';

export interface PreviewOptions {
  width?: number;
  height?: number;
  showControls?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PrintPreviewService {

  constructor() { }

  /**
   * Open PDF in new window with preview controls
   */
  openPdfPreview(
    pdfBlob: Blob, 
    filename: string, 
    options: PreviewOptions = {}
  ): Window | null {
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const windowFeatures = `width=${options.width || 900},height=${options.height || 700},scrollbars=yes,resizable=yes`;
    
    const previewWindow = window.open(pdfUrl, '_blank', windowFeatures);
    
    if (previewWindow && options.showControls !== false) {
      this.addPreviewControls(previewWindow, pdfBlob, filename);
    }
    
    return previewWindow;
  }

  /**
   * Add download, print, and close controls to preview window
   */
  private addPreviewControls(previewWindow: Window, pdfBlob: Blob, filename: string): void {
    previewWindow.addEventListener('load', () => {
      const style = previewWindow.document.createElement('style');
      style.textContent = `
        .pdf-controls {
          position: fixed;
          top: 10px;
          right: 10px;
          z-index: 1000;
          background: rgba(0,0,0,0.8);
          padding: 10px;
          border-radius: 5px;
        }
        .pdf-controls button {
          margin: 0 5px;
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        }
        .pdf-controls button:hover {
          background: #0056b3;
        }
        .pdf-controls button:active {
          background: #004085;
        }
      `;
      previewWindow.document.head.appendChild(style);

      const controls = previewWindow.document.createElement('div');
      controls.className = 'pdf-controls';
      controls.innerHTML = `
        <button onclick="window.print()" title="Print PDF">Print</button>
        <button id="download-btn" title="Download PDF">Download</button>
        <button onclick="window.close()" title="Close Window">Close</button>
      `;
      previewWindow.document.body.appendChild(controls);

      // Add download functionality
      const downloadBtn = previewWindow.document.getElementById('download-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          this.downloadBlob(pdfBlob, filename);
        });
      }
    });
  }

  /**
   * Download a blob as a file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate print-friendly filename
   */
  generateFilename(prefix: string, courseName?: string, date?: Date): string {
    const dateStr = date ? 
      date.toLocaleDateString().replace(/[/\\?%*:|"<>]/g, '-') : 
      new Date().toLocaleDateString().replace(/[/\\?%*:|"<>]/g, '-');
    
    const courseStr = courseName?.replace(/[/\\?%*:|"<>]/g, '-') || 'golf';
    
    return `${prefix}-${courseStr}-${dateStr}.pdf`;
  }

  /**
   * Print PDF directly without preview
   */
  printPdfDirectly(pdfBlob: Blob): void {
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, '_blank');
    
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
        printWindow.close();
      });
    }
  }
}