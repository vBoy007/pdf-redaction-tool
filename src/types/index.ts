export type ToolType = 'select' | 'redact' | 'text' | 'image';

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RedactionBox extends Rectangle {
  id: string;
  pageNumber: number;
  color: 'black' | 'white' | string; // Allow custom hex colors
}

export interface TextAnnotation {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  bold: boolean;
}

export interface ImageAnnotation {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: string; // base64
  lockAspectRatio: boolean;
}

export interface PDFPage {
  pageNumber: number;
  viewport: {
    width: number;
    height: number;
    scale: number;
  };
  canvas?: HTMLCanvasElement;
}

export interface DocumentState {
  file: File | null;
  fileName: string;
  numPages: number;
  currentPage: number;
  zoom: number;
  pages: PDFPage[];
  redactions: RedactionBox[];
  textAnnotations: TextAnnotation[];
  imageAnnotations: ImageAnnotation[];
  currentTool: ToolType;
  isProcessing: boolean;
  error: string | null;
}

export interface DragState {
  isDragging: boolean;
  startPoint: Point | null;
  currentBox: Rectangle | null;
  selectedItemId: string | null;
  selectedItemType: 'redaction' | 'text' | 'image' | null;
}
