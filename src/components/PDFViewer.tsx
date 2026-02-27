import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { pdfEngine } from '@/lib/pdfEngine';
import { TextFormatPanel } from './TextFormatPanel';
import { RedactionSettingsPanel } from './RedactionSettingsPanel';
import { TemplateTextsPanel } from './TemplateTextsPanel';
import type { DragState } from '@/types';

export const PDFViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    file,
    currentPage,
    zoom,
    currentTool,
    setCurrentTool,
    redactions,
    textAnnotations,
    imageAnnotations,
    addRedaction,
    addTextAnnotation,
    addImageAnnotation,
    updateTextAnnotation,
    updateImageAnnotation,
    removeTextAnnotation,
  } = useDocumentStore();

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startPoint: null,
    currentBox: null,
    selectedItemId: null,
    selectedItemType: null,
  });

  const [draggingAnnotation, setDraggingAnnotation] = useState<{
    id: string;
    type: 'text' | 'image';
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [resizingImage, setResizingImage] = useState<{
    id: string;
    handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
    originalWidth: number;
    originalHeight: number;
  } | null>(null);

  const [selectedAnnotation, setSelectedAnnotation] = useState<{
    id: string;
    type: 'text' | 'image';
  } | null>(null);

  const [editingText, setEditingText] = useState<{
    id: string;
    value: string;
  } | null>(null);

  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedRedactionId, setSelectedRedactionId] = useState<string | null>(null);

  // Render PDF page to background canvas
  useEffect(() => {
    if (!file || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        await pdfEngine.renderPage({
          pageNumber: currentPage,
          scale: zoom,
          canvas: canvasRef.current!,
        });
        
        // Sync overlay canvas size
        if (overlayCanvasRef.current && canvasRef.current) {
          overlayCanvasRef.current.width = canvasRef.current.width;
          overlayCanvasRef.current.height = canvasRef.current.height;
        }
      } catch (error) {
        console.error('Render error:', error);
      }
    };

    renderPage();
  }, [file, currentPage, zoom]);

  // Draw annotations and overlays on separate canvas
  useEffect(() => {
    if (!overlayCanvasRef.current) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get current page items
    const pageRedactions = redactions.filter((r) => r.pageNumber === currentPage);
    const pageTexts = textAnnotations.filter((t) => t.pageNumber === currentPage);
    const pageImages = imageAnnotations.filter((i) => i.pageNumber === currentPage);

    // Draw redactions
    pageRedactions.forEach((r) => {
      // Scale coordinates according to zoom
      const x = r.x * zoom;
      const y = r.y * zoom;
      const width = r.width * zoom;
      const height = r.height * zoom;
      
      // Parse color
      let fillColor = 'rgba(0, 0, 0, 0.8)'; // default black
      
      if (r.color === 'black') {
        fillColor = 'rgba(0, 0, 0, 0.8)';
      } else if (r.color === 'white') {
        fillColor = 'rgba(255, 255, 255, 0.8)';
      } else if (r.color.startsWith('#')) {
        // Hex color
        const hex = r.color;
        const rVal = parseInt(hex.slice(1, 3), 16);
        const gVal = parseInt(hex.slice(3, 5), 16);
        const bVal = parseInt(hex.slice(5, 7), 16);
        fillColor = `rgba(${rVal}, ${gVal}, ${bVal}, 0.8)`;
      }
      
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, width, height);
      
      // Highlight if selected
      const isSelected = selectedRedactionId === r.id;
      ctx.strokeStyle = isSelected ? '#FF6B00' : '#FF0000';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(x, y, width, height);
    });

    // Draw text annotations
    pageTexts.forEach((t) => {
      // Scale coordinates according to zoom
      const x = t.x * zoom;
      const y = t.y * zoom;
      const fontSize = t.fontSize * zoom;
      
      ctx.font = `${t.bold ? 'bold' : 'normal'} ${fontSize}px Arial`;
      ctx.fillStyle = t.color || '#000000';
      
      // Split text into lines
      const lines = t.text.split('\n');
      const lineHeight = fontSize * 1.2; // 20% spacing
      
      let maxWidth = 0;
      lines.forEach((line, index) => {
        if (line.trim() === '') return; // Skip empty lines
        
        const yPos = y + fontSize + (index * lineHeight);
        ctx.fillText(line, x, yPos);
        
        // Track max width for selection box
        const metrics = ctx.measureText(line);
        if (metrics.width > maxWidth) maxWidth = metrics.width;
      });
      
      // Draw selection box around all lines
      const totalHeight = lines.length * lineHeight;
      const isBeingDragged = draggingAnnotation?.id === t.id && draggingAnnotation?.type === 'text';
      ctx.strokeStyle = isBeingDragged ? '#FF6B00' : '#0000FF';
      ctx.lineWidth = isBeingDragged ? 3 : 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x - 2, y - 2, maxWidth + 4, totalHeight + 4);
      ctx.setLineDash([]);
    });

    // Draw image annotations
    const loadImages = async () => {
      for (const img of pageImages) {
        // Scale coordinates according to zoom
        const x = img.x * zoom;
        const y = img.y * zoom;
        const width = img.width * zoom;
        const height = img.height * zoom;
        
        const image = new Image();
        await new Promise<void>((resolve) => {
          image.onload = () => {
            ctx.drawImage(image, x, y, width, height);
            
            // Draw selection box
            const isBeingDragged = draggingAnnotation?.id === img.id && draggingAnnotation?.type === 'image';
            const isSelected = selectedAnnotation?.id === img.id && selectedAnnotation?.type === 'image';
            const isBeingResized = resizingImage?.id === img.id;
            
            if (isBeingDragged || isSelected || isBeingResized) {
              ctx.strokeStyle = isBeingDragged || isBeingResized ? '#FF6B00' : '#00FF00';
              ctx.lineWidth = isBeingDragged || isBeingResized ? 3 : 2;
              ctx.setLineDash([3, 3]);
              ctx.strokeRect(x, y, width, height);
              ctx.setLineDash([]);
              
              // Draw resize handles if selected or resizing
              if (isSelected || isBeingResized) {
                const handleSize = 8;
                const handles = [
                  { x: x, y: y, cursor: 'nw-resize' }, // NW
                  { x: x + width, y: y, cursor: 'ne-resize' }, // NE
                  { x: x, y: y + height, cursor: 'sw-resize' }, // SW
                  { x: x + width, y: y + height, cursor: 'se-resize' }, // SE
                  { x: x + width / 2, y: y, cursor: 'n-resize' }, // N
                  { x: x + width / 2, y: y + height, cursor: 's-resize' }, // S
                  { x: x, y: y + height / 2, cursor: 'w-resize' }, // W
                  { x: x + width, y: y + height / 2, cursor: 'e-resize' }, // E
                ];
                
                handles.forEach(handle => {
                  ctx.fillStyle = '#FFFFFF';
                  ctx.strokeStyle = '#00FF00';
                  ctx.lineWidth = 2;
                  ctx.fillRect(
                    handle.x - handleSize / 2,
                    handle.y - handleSize / 2,
                    handleSize,
                    handleSize
                  );
                  ctx.strokeRect(
                    handle.x - handleSize / 2,
                    handle.y - handleSize / 2,
                    handleSize,
                    handleSize
                  );
                });
              }
            } else {
              // Draw normal border
              ctx.strokeStyle = '#00FF00';
              ctx.lineWidth = 2;
              ctx.setLineDash([3, 3]);
              ctx.strokeRect(x, y, width, height);
              ctx.setLineDash([]);
            }
            
            resolve();
          };
          image.onerror = () => resolve();
          image.src = img.imageData;
        });
      }
    };
    
    loadImages();

    // Draw current drag box
    if (dragState.currentBox && dragState.isDragging) {
      ctx.strokeStyle = '#0000FF';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        dragState.currentBox.x,
        dragState.currentBox.y,
        dragState.currentBox.width,
        dragState.currentBox.height
      );
      ctx.setLineDash([]);
    }
  }, [redactions, textAnnotations, imageAnnotations, currentPage, dragState, draggingAnnotation, resizingImage, selectedAnnotation, selectedRedactionId, zoom]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!overlayCanvasRef.current) return;

      const rect = overlayCanvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom; // Unscale coordinates
      const y = (e.clientY - rect.top) / zoom;

      console.log('MouseDown:', { x, y, currentTool });

      // Check for resize handles on images FIRST
      const pageImages = imageAnnotations.filter((i) => i.pageNumber === currentPage);
      
      // Check for redaction boxes (за settings)
      const pageRedactions = redactions.filter((r) => r.pageNumber === currentPage);
      for (const redaction of pageRedactions) {
        const hitPadding = 5;
        if (
          x >= redaction.x - hitPadding &&
          x <= redaction.x + redaction.width + hitPadding &&
          y >= redaction.y - hitPadding &&
          y <= redaction.y + redaction.height + hitPadding
        ) {
          console.log('Hit redaction box:', redaction.id);
          // Затвори ВСИЧКИ други панели и отвори този
          setSelectedRedactionId(redaction.id);
          setSelectedAnnotation(null);
          setShowTemplates(false);
          setEditingText(null);
          return;
        }
      }
      
      for (const img of pageImages) {
        const handleSize = 8;
        const handles = [
          { name: 'nw' as const, x: img.x, y: img.y },
          { name: 'ne' as const, x: img.x + img.width, y: img.y },
          { name: 'sw' as const, x: img.x, y: img.y + img.height },
          { name: 'se' as const, x: img.x + img.width, y: img.y + img.height },
          { name: 'n' as const, x: img.x + img.width / 2, y: img.y },
          { name: 's' as const, x: img.x + img.width / 2, y: img.y + img.height },
          { name: 'w' as const, x: img.x, y: img.y + img.height / 2 },
          { name: 'e' as const, x: img.x + img.width, y: img.y + img.height / 2 },
        ];

        for (const handle of handles) {
          if (
            x >= handle.x - handleSize &&
            x <= handle.x + handleSize &&
            y >= handle.y - handleSize &&
            y <= handle.y + handleSize
          ) {
            console.log('Hit resize handle:', handle.name);
            setResizingImage({
              id: img.id,
              handle: handle.name,
              startX: x,
              startY: y,
              originalX: img.x,
              originalY: img.y,
              originalWidth: img.width,
              originalHeight: img.height,
            });
            setSelectedAnnotation({ id: img.id, type: 'image' });
            return;
          }
        }
      }

      // Check text annotations
      const pageTexts = textAnnotations.filter((t) => t.pageNumber === currentPage);
      for (const text of pageTexts) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (!ctx) continue;
        
        ctx.font = `${text.bold ? 'bold' : 'normal'} ${text.fontSize}px Arial`;
        
        // Calculate bounding box for multi-line text
        const lines = text.text.split('\n');
        const lineHeight = text.fontSize * 1.2;
        let maxWidth = 0;
        
        lines.forEach(line => {
          const metrics = ctx.measureText(line);
          if (metrics.width > maxWidth) maxWidth = metrics.width;
        });
        
        const totalHeight = lines.length * lineHeight;
        
        const hitPadding = 5;
        if (
          x >= text.x - hitPadding &&
          x <= text.x + maxWidth + hitPadding &&
          y >= text.y - hitPadding &&
          y <= text.y + totalHeight + hitPadding
        ) {
          console.log('Hit text annotation:', text.id);
          setDraggingAnnotation({
            id: text.id,
            type: 'text',
            startX: x,
            startY: y,
            offsetX: x - text.x,
            offsetY: y - text.y,
          });
          setSelectedAnnotation({ id: text.id, type: 'text' });
          return;
        }
      }

      // Check image annotations (for dragging)
      for (const img of pageImages) {
        const hitPadding = 5;
        if (
          x >= img.x - hitPadding &&
          x <= img.x + img.width + hitPadding &&
          y >= img.y - hitPadding &&
          y <= img.y + img.height + hitPadding
        ) {
          console.log('Hit image annotation:', img.id);
          setDraggingAnnotation({
            id: img.id,
            type: 'image',
            startX: x,
            startY: y,
            offsetX: x - img.x,
            offsetY: y - img.y,
          });
          setSelectedAnnotation({ id: img.id, type: 'image' });
          return;
        }
      }

      // Click на празно място - затвори всички панели
      setSelectedAnnotation(null);
      setSelectedRedactionId(null);
      setShowTemplates(false);
      setEditingText(null);

      // Redaction tool (само ако нищо друго не е hit-нато)
      if (currentTool === 'redact') {
        console.log('Starting redaction box');
        setDragState({
          isDragging: true,
          startPoint: { x, y },
          currentBox: { x, y, width: 0, height: 0 },
          selectedItemId: null,
          selectedItemType: null,
        });
      }
    },
    [currentTool, currentPage, textAnnotations, imageAnnotations, redactions]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!overlayCanvasRef.current) return;

      const rect = overlayCanvasRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / zoom; // Unscale
      const currentY = (e.clientY - rect.top) / zoom;

      // Handle resizing images
      if (resizingImage) {
        const deltaX = currentX - resizingImage.startX;
        const deltaY = currentY - resizingImage.startY;

        let newX = resizingImage.originalX;
        let newY = resizingImage.originalY;
        let newWidth = resizingImage.originalWidth;
        let newHeight = resizingImage.originalHeight;

        const aspectRatio = resizingImage.originalWidth / resizingImage.originalHeight;

        switch (resizingImage.handle) {
          case 'se': // Southeast (bottom-right) - LOCK ASPECT RATIO
            newWidth = Math.max(20, resizingImage.originalWidth + deltaX);
            newHeight = newWidth / aspectRatio;
            break;
          case 'sw': // Southwest (bottom-left) - LOCK ASPECT RATIO
            newWidth = Math.max(20, resizingImage.originalWidth - deltaX);
            newX = resizingImage.originalX + resizingImage.originalWidth - newWidth;
            newHeight = newWidth / aspectRatio;
            break;
          case 'ne': // Northeast (top-right) - LOCK ASPECT RATIO
            newWidth = Math.max(20, resizingImage.originalWidth + deltaX);
            newHeight = newWidth / aspectRatio;
            newY = resizingImage.originalY + resizingImage.originalHeight - newHeight;
            break;
          case 'nw': // Northwest (top-left) - LOCK ASPECT RATIO
            newWidth = Math.max(20, resizingImage.originalWidth - deltaX);
            newX = resizingImage.originalX + resizingImage.originalWidth - newWidth;
            newHeight = newWidth / aspectRatio;
            newY = resizingImage.originalY + resizingImage.originalHeight - newHeight;
            break;
          case 'e': // East (right) - FREE RESIZE (width only)
            newWidth = Math.max(20, resizingImage.originalWidth + deltaX);
            // Height stays the same - може да изкриви
            break;
          case 'w': // West (left) - FREE RESIZE (width only)
            newWidth = Math.max(20, resizingImage.originalWidth - deltaX);
            newX = resizingImage.originalX + resizingImage.originalWidth - newWidth;
            // Height stays the same - може да изкриви
            break;
          case 's': // South (bottom) - FREE RESIZE (height only)
            newHeight = Math.max(20, resizingImage.originalHeight + deltaY);
            // Width stays the same - може да изкриви
            break;
          case 'n': // North (top) - FREE RESIZE (height only)
            newHeight = Math.max(20, resizingImage.originalHeight - deltaY);
            newY = resizingImage.originalY + resizingImage.originalHeight - newHeight;
            // Width stays the same - може да изкриви
            break;
        }

        updateImageAnnotation(resizingImage.id, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
        return;
      }

      // Handle dragging annotations
      if (draggingAnnotation) {
        const newX = currentX - draggingAnnotation.offsetX;
        const newY = currentY - draggingAnnotation.offsetY;

        console.log('Dragging annotation:', { id: draggingAnnotation.id, newX, newY });

        if (draggingAnnotation.type === 'text') {
          updateTextAnnotation(draggingAnnotation.id, { x: newX, y: newY });
        } else if (draggingAnnotation.type === 'image') {
          updateImageAnnotation(draggingAnnotation.id, { x: newX, y: newY });
        }
        return;
      }

      // Handle redaction box drawing
      if (dragState.isDragging && dragState.startPoint) {
        const x = Math.min(dragState.startPoint.x, currentX);
        const y = Math.min(dragState.startPoint.y, currentY);
        const width = Math.abs(currentX - dragState.startPoint.x);
        const height = Math.abs(currentY - dragState.startPoint.y);

        setDragState((prev) => ({
          ...prev,
          currentBox: { x, y, width, height },
        }));
      }
    },
    [dragState, draggingAnnotation, resizingImage, updateTextAnnotation, updateImageAnnotation]
  );

  const handleMouseUp = useCallback(() => {
    // Stop resizing
    if (resizingImage) {
      console.log('Stopped resizing image');
      setResizingImage(null);
      return;
    }

    // Stop dragging annotation
    if (draggingAnnotation) {
      console.log('Stopped dragging annotation');
      setDraggingAnnotation(null);
      return;
    }

    // Complete redaction box
    if (dragState.isDragging && dragState.currentBox) {
      if (dragState.currentBox.width > 10 && dragState.currentBox.height > 10) {
        console.log('Creating redaction box');
        addRedaction({
          id: `redact-${Date.now()}`,
          pageNumber: currentPage,
          x: dragState.currentBox.x,
          y: dragState.currentBox.y,
          width: dragState.currentBox.width,
          height: dragState.currentBox.height,
          color: 'black',
        });
      }

      setDragState({
        isDragging: false,
        startPoint: null,
        currentBox: null,
        selectedItemId: null,
        selectedItemType: null,
      });
      
      // Auto-switch to select tool след добавяне на redaction
      setCurrentTool('select');
    }
  }, [dragState, draggingAnnotation, resizingImage, currentPage, addRedaction, setCurrentTool]);

  const handleTextClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (currentTool !== 'text' || !overlayCanvasRef.current) return;

      // Check if clicking on existing text
      const rect = overlayCanvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const pageTexts = textAnnotations.filter((t) => t.pageNumber === currentPage);
      for (const text of pageTexts) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (!ctx) continue;
        
        ctx.font = `${text.bold ? 'bold' : 'normal'} ${text.fontSize}px Arial`;
        
        const lines = text.text.split('\n');
        const lineHeight = text.fontSize * 1.2;
        let maxWidth = 0;
        
        lines.forEach(line => {
          const metrics = ctx.measureText(line);
          if (metrics.width > maxWidth) maxWidth = metrics.width;
        });
        
        const totalHeight = lines.length * lineHeight;
        
        const hitPadding = 5;
        if (
          x >= text.x - hitPadding &&
          x <= text.x + maxWidth + hitPadding &&
          y >= text.y - hitPadding &&
          y <= text.y + totalHeight + hitPadding
        ) {
          // Click на existing text - select за edit
          setSelectedAnnotation({ id: text.id, type: 'text' });
          setEditingText({ id: text.id, value: text.text });
          // Затвори другите панели
          setShowTemplates(false);
          setSelectedRedactionId(null);
          return;
        }
      }

      // Click извън existing text - покажи templates
      setShowTemplates(true);
      // Затвори другите панели
      setSelectedRedactionId(null);
      setSelectedAnnotation(null);
      setEditingText(null);
      
      // Запази позицията за по-късно
      (window as any).__pendingTextPosition = { x, y, pageNumber: currentPage };
    },
    [currentTool, currentPage, textAnnotations]
  );

  const handleTemplateSelect = useCallback((templateText: string) => {
    const pos = (window as any).__pendingTextPosition;
    if (!pos) return;

    const newText: any = {
      id: `text-${Date.now()}`,
      pageNumber: pos.pageNumber,
      x: pos.x,
      y: pos.y,
      text: templateText,
      fontSize: 14,
      color: '#000000',
      bold: false,
    };

    addTextAnnotation(newText);
    setSelectedAnnotation({ id: newText.id, type: 'text' });
    setEditingText({ id: newText.id, value: newText.text });
    setShowTemplates(false);
    
    // Auto-switch to select tool след добавяне на текст
    setTimeout(() => setCurrentTool('select'), 100);
    
    delete (window as any).__pendingTextPosition;
  }, [addTextAnnotation, setCurrentTool]);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (currentTool !== 'image') return;

      const rect = overlayCanvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if clicking on existing image
      const pageImages = imageAnnotations.filter((i) => i.pageNumber === currentPage);
      for (const img of pageImages) {
        const hitPadding = 5;
        if (
          x >= img.x - hitPadding &&
          x <= img.x + img.width + hitPadding &&
          y >= img.y - hitPadding &&
          y <= img.y + img.height + hitPadding
        ) {
          // Click на existing image - select за edit
          setSelectedAnnotation({ id: img.id, type: 'image' });
          // Затвори другите панели
          setSelectedRedactionId(null);
          setShowTemplates(false);
          setEditingText(null);
          return;
        }
      }

      // Click извън existing images - upload нова
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/jpg';
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file || !overlayCanvasRef.current) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          const imageData = e.target?.result as string;
          
          const newImage: any = {
            id: `image-${Date.now()}`,
            pageNumber: currentPage,
            x: Math.max(0, x - 75), // Center at click
            y: Math.max(0, y - 75),
            width: 150,
            height: 150,
            imageData,
            lockAspectRatio: true,
          };

          addImageAnnotation(newImage);
          setSelectedAnnotation({ id: newImage.id, type: 'image' });
          
          // Auto-switch to select tool след добавяне на снимка
          setTimeout(() => setCurrentTool('select'), 100);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    },
    [currentTool, currentPage, imageAnnotations, addImageAnnotation, setCurrentTool]
  );

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'text') {
      handleTextClick(e);
    } else if (currentTool === 'image') {
      handleImageClick(e);
    }
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Няма зареден документ
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center h-full bg-gray-100 overflow-auto p-4"
    >
      <div className="relative">
        {/* Background PDF canvas */}
        <canvas
          ref={canvasRef}
          className="shadow-lg bg-white"
        />
        {/* Overlay canvas for annotations */}
        <canvas
          ref={overlayCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          className="absolute top-0 left-0"
          style={{
            cursor: draggingAnnotation
              ? 'grabbing'
              : currentTool === 'redact'
              ? 'crosshair'
              : currentTool === 'text'
              ? 'text'
              : currentTool === 'image'
              ? 'copy'
              : 'grab',
          }}
        />

        {/* Inline Text Editor */}
        {editingText && (() => {
          const text = textAnnotations.find(t => t.id === editingText.id);
          if (!text || text.pageNumber !== currentPage) return null;

          return (
            <div
              style={{
                position: 'absolute',
                left: `${text.x * zoom}px`,
                top: `${text.y * zoom}px`,
                zIndex: 1000,
              }}
              className="inline-text-editor"
            >
              <textarea
                autoFocus
                value={editingText.value}
                onChange={(e) => {
                  setEditingText({ ...editingText, value: e.target.value });
                  updateTextAnnotation(text.id, { text: e.target.value });
                }}
                onBlur={() => {
                  if (editingText.value.trim() === '' || editingText.value === 'Въведете текст...') {
                    removeTextAnnotation(text.id);
                  }
                  setEditingText(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingText(null);
                  }
                }}
                className="px-2 py-1 border-2 border-blue-500 rounded bg-white shadow-lg resize"
                style={{
                  fontSize: `${text.fontSize * zoom}px`,
                  fontWeight: text.bold ? 'bold' : 'normal',
                  fontFamily: 'Arial, sans-serif',
                  color: text.color || '#000000',
                  minWidth: '200px',
                  minHeight: `${text.fontSize * zoom * 3}px`,
                }}
                rows={3}
              />
              <div className="text-xs text-gray-500 mt-1 bg-white px-2 py-1 rounded shadow">
                ESC за затваряне • Resize с drag на ъгъла
              </div>
            </div>
          );
        })()}
      </div>

      {/* Text Format Panel */}
      {selectedAnnotation?.type === 'text' && !editingText && (
        <TextFormatPanel
          textId={selectedAnnotation.id}
          onClose={() => setSelectedAnnotation(null)}
        />
      )}

      {/* Redaction Settings Panel */}
      {selectedRedactionId && (
        <RedactionSettingsPanel
          redactionId={selectedRedactionId}
          onClose={() => setSelectedRedactionId(null)}
        />
      )}

      {/* Template Texts Panel */}
      {showTemplates && currentTool === 'text' && (
        <TemplateTextsPanel
          onSelectTemplate={handleTemplateSelect}
        />
      )}
    </div>
  );
};
