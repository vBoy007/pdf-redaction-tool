import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface RenderPageOptions {
  pageNumber: number;
  scale: number;
  canvas: HTMLCanvasElement;
}

export class PDFEngine {
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

  async loadDocument(file: File): Promise<number> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      this.pdfDoc = await loadingTask.promise;
      return this.pdfDoc.numPages;
    } catch (error) {
      console.error('Error loading PDF:', error);
      throw new Error('Неуспешно зареждане на PDF документа');
    }
  }

  async renderPage(options: RenderPageOptions): Promise<void> {
    if (!this.pdfDoc) {
      throw new Error('PDF документът не е зареден');
    }

    try {
      const page = await this.pdfDoc.getPage(options.pageNumber);
      const viewport = page.getViewport({ scale: options.scale });

      const canvas = options.canvas;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Canvas context не може да бъде създаден');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (error) {
      console.error('Error rendering page:', error);
      throw new Error(`Грешка при рендериране на страница ${options.pageNumber}`);
    }
  }

  async getPageDimensions(pageNumber: number, scale: number = 1.0) {
    if (!this.pdfDoc) {
      throw new Error('PDF документът не е зареден');
    }

    const page = await this.pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    return {
      width: viewport.width,
      height: viewport.height,
      scale: scale,
    };
  }

  getDocument() {
    return this.pdfDoc;
  }

  destroy() {
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
  }
}

export const pdfEngine = new PDFEngine();
