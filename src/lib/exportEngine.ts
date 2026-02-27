import { PDFDocument, rgb } from 'pdf-lib';
import { redactionEngine } from './redactionEngine';
import type { RedactionBox, TextAnnotation, ImageAnnotation } from '@/types';

export interface ExportOptions {
  file: File;
  fileName: string;
  redactions: RedactionBox[];
  textAnnotations: TextAnnotation[];
  imageAnnotations: ImageAnnotation[];
  secureMode: boolean;
}

export class ExportEngine {
  async exportPDF(options: ExportOptions): Promise<Blob> {
    try {
      if (options.secureMode) {
        // SECURE MODE: Burn everything into canvas then flatten
        return await this.exportSecureMode(options);
      } else {
        // QUICK MODE: Just overlay annotations
        return await this.exportQuickMode(options);
      }
    } catch (error) {
      console.error('Export error:', error);
      throw new Error('Грешка при експортиране на PDF');
    }
  }

  private async exportQuickMode(options: ExportOptions): Promise<Blob> {
    // Load original PDF
    const arrayBuffer = await options.file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Apply redactions (overlay mode)
    const pages = pdfDoc.getPages();
    const redactionsByPage = this.groupByPage(options.redactions);

    for (const [pageNumber, boxes] of redactionsByPage.entries()) {
      const pageIndex = pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;
      
      const page = pages[pageIndex];
      const { height } = page.getSize();

      boxes.forEach((box) => {
        let r = 0, g = 0, b = 0;
        
        if (box.color === 'black') {
          r = g = b = 0;
        } else if (box.color === 'white') {
          r = g = b = 1;
        } else if (box.color.startsWith('#')) {
          // Parse hex color
          r = parseInt(box.color.slice(1, 3), 16) / 255;
          g = parseInt(box.color.slice(3, 5), 16) / 255;
          b = parseInt(box.color.slice(5, 7), 16) / 255;
        }
        
        const color = rgb(r, g, b); // Use pdf-lib's rgb() function
        
        page.drawRectangle({
          x: box.x,
          y: height - box.y - box.height,
          width: box.width,
          height: box.height,
          color: color,
          opacity: 1,
        });
      });
    }

    // Add text annotations BEFORE saving (FIXED!)
    if (options.textAnnotations.length > 0) {
      await redactionEngine.addTextAnnotations(pdfDoc, options.textAnnotations);
    }

    // Add image annotations BEFORE saving (FIXED!)
    if (options.imageAnnotations.length > 0) {
      await redactionEngine.addImageAnnotations(pdfDoc, options.imageAnnotations);
    }

    const pdfBytes = await pdfDoc.save();
    // Copy to ensure ArrayBuffer (not SharedArrayBuffer) for Blob compatibility
    const pdfBytesCopy = new Uint8Array(pdfBytes);
    return new Blob([pdfBytesCopy], { type: 'application/pdf' });
  }

  private async exportSecureMode(options: ExportOptions): Promise<Blob> {
    // For Secure Mode, we need to:
    // 1. Render PDF page to canvas
    // 2. Draw ALL annotations (redactions, text, images) on canvas
    // 3. Convert canvas to image and embed in new PDF
    
    const arrayBuffer = await options.file.arrayBuffer();
    const originalPdfDoc = await PDFDocument.load(arrayBuffer);
    const newPdfDoc = await PDFDocument.create();
    
    const numPages = originalPdfDoc.getPageCount();
    const scale = 2.0; // High DPI

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const canvas = await this.renderPageWithAnnotations(
        pageNum,
        scale,
        options.redactions,
        options.textAnnotations,
        options.imageAnnotations
      );

      // Convert canvas to PNG
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // Get original page dimensions
      const originalPage = originalPdfDoc.getPage(pageNum - 1);
      const { width, height } = originalPage.getSize();

      // Create new page and add flattened image
      const page = newPdfDoc.addPage([width, height]);
      const image = await newPdfDoc.embedPng(imageBytes);
      
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });
    }

    const pdfBytes = await newPdfDoc.save();
    // Copy to ensure ArrayBuffer (not SharedArrayBuffer) for Blob compatibility
    const pdfBytesCopy = new Uint8Array(pdfBytes);
    return new Blob([pdfBytesCopy], { type: 'application/pdf' });
  }

  private async renderPageWithAnnotations(
    pageNumber: number,
    scale: number,
    redactions: RedactionBox[],
    textAnnotations: TextAnnotation[],
    imageAnnotations: ImageAnnotation[]
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    
    // Import pdfEngine dynamically to avoid circular deps
    const { pdfEngine } = await import('./pdfEngine');
    
    // Get page dimensions and render
    const dimensions = await pdfEngine.getPageDimensions(pageNumber, scale);
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    await pdfEngine.renderPage({
      pageNumber,
      scale,
      canvas,
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');

    // Filter annotations for current page
    const pageRedactions = redactions.filter(r => r.pageNumber === pageNumber);
    const pageTexts = textAnnotations.filter(t => t.pageNumber === pageNumber);
    const pageImages = imageAnnotations.filter(i => i.pageNumber === pageNumber);

    // Draw redactions
    pageRedactions.forEach(box => {
      let fillColor = '#000000'; // default black
      
      if (box.color === 'black') {
        fillColor = '#000000';
      } else if (box.color === 'white') {
        fillColor = '#FFFFFF';
      } else if (box.color.startsWith('#')) {
        fillColor = box.color;
      }
      
      ctx.fillStyle = fillColor;
      ctx.fillRect(
        box.x * scale,
        box.y * scale,
        box.width * scale,
        box.height * scale
      );
    });

    // Draw text annotations
    pageTexts.forEach(text => {
      ctx.font = `${text.bold ? 'bold' : 'normal'} ${text.fontSize * scale}px Arial`;
      ctx.fillStyle = text.color || '#000000';
      
      // Split text into lines for multi-line support
      const lines = text.text.split('\n');
      const lineHeight = text.fontSize * scale * 1.2;
      
      lines.forEach((line, index) => {
        if (line.trim() === '') return; // Skip empty lines
        ctx.fillText(line, text.x * scale, (text.y + text.fontSize) * scale + (index * lineHeight));
      });
    });

    // Draw image annotations
    for (const imgAnnotation of pageImages) {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(
            img,
            imgAnnotation.x * scale,
            imgAnnotation.y * scale,
            imgAnnotation.width * scale,
            imgAnnotation.height * scale
          );
          resolve();
        };
        img.onerror = reject;
        img.src = imgAnnotation.imageData;
      });
    }

    return canvas;
  }

  private groupByPage<T extends { pageNumber: number }>(items: T[]): Map<number, T[]> {
    const map = new Map<number, T[]>();
    items.forEach(item => {
      const existing = map.get(item.pageNumber) || [];
      existing.push(item);
      map.set(item.pageNumber, existing);
    });
    return map;
  }

  downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.generateFileName(fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private generateFileName(originalName: string): string {
    const nameWithoutExt = originalName.replace(/\.pdf$/i, '');
    return `${nameWithoutExt}_edited.pdf`;
  }
}

export const exportEngine = new ExportEngine();
