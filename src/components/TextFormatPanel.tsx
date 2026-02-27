import React from 'react';
import { useDocumentStore } from '@/stores/useDocumentStore';

interface TextFormatPanelProps {
  textId: string;
  onClose: () => void;
}

export const TextFormatPanel: React.FC<TextFormatPanelProps> = ({ textId, onClose }) => {
  const { textAnnotations, updateTextAnnotation, removeTextAnnotation } = useDocumentStore();
  
  const text = textAnnotations.find(t => t.id === textId);
  if (!text) return null;

  const fontSizes = [10, 12, 14, 16, 18, 20, 24, 28, 32];

  return (
    <div 
      className="text-format-panel absolute bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        top: '80px',
        right: '20px',
        minWidth: '200px',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Форматиране на текст</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Font Size */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Размер на шрифта
        </label>
        <select
          value={text.fontSize}
          onChange={(e) => updateTextAnnotation(textId, { fontSize: Number(e.target.value) })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        >
          {fontSizes.map(size => (
            <option key={size} value={size}>{size}pt</option>
          ))}
        </select>
      </div>

      {/* Bold */}
      <div className="mb-3">
        <label className="flex items-center text-sm text-gray-700">
          <input
            type="checkbox"
            checked={text.bold}
            onChange={(e) => updateTextAnnotation(textId, { bold: e.target.checked })}
            className="mr-2"
          />
          <span className="font-bold">Удебелен</span>
        </label>
      </div>

      {/* Color Picker */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Цвят на текста
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="color"
            value={text.color}
            onChange={(e) => updateTextAnnotation(textId, { color: e.target.value })}
            className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
          />
          <span className="text-xs text-gray-600">{text.color}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {['#000000', '#FF0000', '#0000FF', '#008000', '#FF6B00', '#800080'].map(color => (
            <button
              key={color}
              onClick={() => updateTextAnnotation(textId, { color })}
              className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Text Content */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Текст
        </label>
        <textarea
          value={text.text}
          onChange={(e) => updateTextAnnotation(textId, { text: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          rows={3}
        />
      </div>

      {/* Delete */}
      <button
        onClick={() => {
          removeTextAnnotation(textId);
          onClose();
        }}
        className="w-full px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
      >
        Изтрий текст
      </button>
    </div>
  );
};
