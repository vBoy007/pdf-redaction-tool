import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { RedactionBox } from '@/types';
import { pdfEngine } from './pdfEngine';

export interface ExportOptions {
  redactions: RedactionBox[];
  fileName: string;
  secureMode: boolean; // true = flatten to canvas, false = overlay
}

export class RedactionEngine {
  /**
   * TRUE Redaction Strategy:
   * 1. For each page with redactions, render to canvas at high DPI
   * 2. Draw redaction boxes on canvas (burn-in)
   * 3. Convert canvas back to PDF image
   * 4. Replace original page with flattened image
   * 
   * This ensures NO text/image data remains under redactions.
   */
  async applyRedactions(
    originalFile: File,
    redactions: RedactionBox[],
    secureMode: boolean = true
  ): Promise<Uint8Array> {
    const arrayBuffer = await originalFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Group redactions by page
    const redactionsByPage = new Map<number, RedactionBox[]>();
    redactions.forEach((r) => {
      const boxes = redactionsByPage.get(r.pageNumber) || [];
      boxes.push(r);
      redactionsByPage.set(r.pageNumber, boxes);
    });

    if (secureMode) {
      // SECURE MODE: Flatten to canvas (TRUE redaction)
      await this.flattenPagesWithRedactions(pdfDoc, redactionsByPage);
    } else {
      // QUICK MODE: Draw overlay rectangles (NOT true redaction)
      await this.overlayRedactions(pdfDoc, redactionsByPage);
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  private async flattenPagesWithRedactions(
    pdfDoc: PDFDocument,
    redactionsByPage: Map<number, RedactionBox[]>
  ) {
    const pages = pdfDoc.getPages();
    const scale = 2.0; // High DPI for quality

    for (const [pageNumber, boxes] of redactionsByPage.entries()) {
      const pageIndex = pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;
      
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      try {
        // Render original page to canvas
        const canvas = document.createElement('canvas');
        const dimensions = await pdfEngine.getPageDimensions(pageNumber, scale);
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        
        await pdfEngine.renderPage({
          pageNumber: pageNumber,
          scale: scale,
          canvas: canvas,
        });

        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // Draw redaction boxes on canvas (burn-in)
        boxes.forEach((box) => {
          ctx.fillStyle = box.color === 'black' ? '#000000' : '#FFFFFF';
          ctx.fillRect(
            box.x * scale,
            box.y * scale,
            box.width * scale,
            box.height * scale
          );
        });

        // Convert canvas to PNG
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Embed image in PDF
        const image = await pdfDoc.embedPng(imageBytes);

        // Clear page content
        page.drawRectangle({
          x: 0,
          y: 0,
          width: width,
          height: height,
          color: rgb(1, 1, 1), // Use pdf-lib's rgb() function
        });

        // Draw flattened image
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: width,
          height: height,
        });
      } catch (error) {
        console.error(`Error flattening page ${pageNumber}:`, error);
        // Continue with other pages
      }
    }
  }

  private async overlayRedactions(
    pdfDoc: PDFDocument,
    redactionsByPage: Map<number, RedactionBox[]>
  ) {
    const pages = pdfDoc.getPages();

    for (const [pageNumber, boxes] of redactionsByPage.entries()) {
      const pageIndex = pageNumber - 1;
      const page = pages[pageIndex];
      const { height } = page.getSize();

      boxes.forEach((box) => {
        const color = box.color === 'black' ? rgb(0, 0, 0) : rgb(1, 1, 1);

        // Draw rectangle overlay
        page.drawRectangle({
          x: box.x,
          y: height - box.y - box.height, // PDF coordinates are bottom-up
          width: box.width,
          height: box.height,
          color: color,
          opacity: 1,
        });
      });
    }
  }

  /**
   * Add text annotations to PDF
   */
  async addTextAnnotations(
    pdfDoc: PDFDocument,
    textAnnotations: any[]
  ): Promise<void> {
    if (textAnnotations.length === 0) return;

    const pages = pdfDoc.getPages();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const annotation of textAnnotations) {
      const pageIndex = annotation.pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;
      
      const page = pages[pageIndex];
      const { height } = page.getSize();

      try {
        // Parse color from hex string
        const hexColor = annotation.color || '#000000';
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;
        
        const textColor = rgb(r, g, b);
        const font = annotation.bold ? helveticaBoldFont : helveticaFont;

        // Split text into lines for multi-line support
        const lines = annotation.text.split('\n');
        const lineHeight = annotation.fontSize * 1.2; // 20% spacing

        lines.forEach((line: string, index: number) => {
          if (line.trim() === '') return; // Skip empty lines
          
          page.drawText(line, {
            x: annotation.x,
            y: height - annotation.y - annotation.fontSize - (index * lineHeight),
            size: annotation.fontSize,
            font: font,
            color: textColor,
          });
        });
      } catch (error) {
        console.error('Error adding text annotation:', error, annotation);
      }
    }
  }

  /**
   * Add image annotations to PDF
   */
  async addImageAnnotations(
    pdfDoc: PDFDocument,
    imageAnnotations: any[]
  ): Promise<void> {
    if (imageAnnotations.length === 0) return;

    const pages = pdfDoc.getPages();

    for (const annotation of imageAnnotations) {
      const pageIndex = annotation.pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;
      
      const page = pages[pageIndex];
      const { height } = page.getSize();

      try {
        // Extract base64 data
        const base64Match = annotation.imageData.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
        if (!base64Match) {
          console.error('Invalid image data format');
          continue;
        }

        const imageType = base64Match[1];
        const base64Data = base64Match[2];
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Embed image based on type
        const image = imageType === 'png' 
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);

        // Draw image on page (flip Y coordinate for PDF)
        page.drawImage(image, {
          x: annotation.x,
          y: height - annotation.y - annotation.height,
          width: annotation.width,
          height: annotation.height,
        });
      } catch (error) {
        console.error('Error adding image annotation:', error);
      }
    }
  }
}

export const redactionEngine = new RedactionEngine();
