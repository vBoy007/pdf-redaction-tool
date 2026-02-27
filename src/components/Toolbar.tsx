import React from 'react';
import {
  Hand,
  Square,
  Type,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FilePlus,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/useDocumentStore';
import type { ToolType } from '@/types';
import clsx from 'clsx';

export const Toolbar: React.FC = () => {
  const {
    currentTool,
    setCurrentTool,
    zoom,
    zoomIn,
    zoomOut,
    fitToWidth,
    currentPage,
    numPages,
    nextPage,
    prevPage,
    file,
    reset,
  } = useDocumentStore();

  const tools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'select', icon: <Hand size={20} />, label: 'Избор / Преместване' },
    { type: 'redact', icon: <Square size={20} />, label: 'Заличаване' },
    { type: 'text', icon: <Type size={20} />, label: 'Текст' },
    { type: 'image', icon: <ImageIcon size={20} />, label: 'Картинка' },
  ];

  const handleNewDocument = () => {
    if (file) {
      // Има зареден файл - покажи confirmation
      const confirmed = window.confirm(
        'Текущият документ ще бъде затворен и всички незапазени промени ще бъдат загубени.\n\nИскате ли да продължите?'
      );
      
      if (!confirmed) {
        // User clicked "Не" - остава на текущия файл
        return;
      }
      
      // User clicked "Да" - reset всичко
      reset();
    }
    
    // Отвори file dialog (работи и ако няма файл, и ако user е confirmed)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Clear previous
      fileInput.click();
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Tools */}
        <div className="flex items-center space-x-2">
          {tools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => setCurrentTool(tool.type)}
              className={clsx(
                'flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors',
                currentTool === tool.type
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              title={tool.label}
            >
              {tool.icon}
              <span className="text-sm font-medium">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Center: Page Navigation */}
        {numPages > 0 && (
          <div className="flex items-center space-x-3">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium">
              Страница {currentPage} / {numPages}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage >= numPages}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Right: Zoom Controls + New Document */}
        <div className="flex items-center space-x-2">
          {/* New Document Button */}
          <button
            onClick={handleNewDocument}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
            title="Нов документ"
          >
            <FilePlus size={18} />
            <span className="text-sm font-medium">Нов документ</span>
          </button>

          <div className="w-px h-8 bg-gray-300" /> {/* Separator */}

          <button
            onClick={zoomOut}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={fitToWidth}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            title="Fit to Width"
          >
            <Maximize2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
