import React from 'react';
import { useDocumentStore } from '@/stores/useDocumentStore';

interface RedactionSettingsPanelProps {
  redactionId: string;
  onClose: () => void;
}

export const RedactionSettingsPanel: React.FC<RedactionSettingsPanelProps> = ({ 
  redactionId, 
  onClose 
}) => {
  const { redactions, updateRedaction, removeRedaction } = useDocumentStore();
  
  const redaction = redactions.find(r => r.id === redactionId);
  if (!redaction) return null;

  const colors = [
    { name: 'Черен', value: 'black', hex: '#000000' },
    { name: 'Бял', value: 'white', hex: '#FFFFFF' },
    { name: 'Червен', value: '#FF0000', hex: '#FF0000' },
    { name: 'Син', value: '#0000FF', hex: '#0000FF' },
    { name: 'Зелен', value: '#008000', hex: '#008000' },
    { name: 'Сив', value: '#808080', hex: '#808080' },
  ];

  return (
    <div 
      className="redaction-settings-panel absolute bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        top: '80px',
        right: '20px',
        minWidth: '200px',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Настройки за заличаване</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Color Selection */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 block mb-2">
          Цвят на заличаването
        </label>
        <div className="grid grid-cols-3 gap-2">
          {colors.map(color => (
            <button
              key={color.value}
              onClick={() => updateRedaction(redactionId, { 
                color: color.value as 'black' | 'white' 
              })}
              className={`p-2 rounded border-2 transition-all ${
                redaction.color === color.value 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ 
                backgroundColor: color.hex,
                color: color.value === 'white' || color.value === '#FFFFFF' ? '#000' : '#FFF'
              }}
            >
              <div className="text-xs font-medium">{color.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Size Info */}
      <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
        <div className="text-gray-600">Размер:</div>
        <div className="font-mono text-gray-800">
          {Math.round(redaction.width)} × {Math.round(redaction.height)} px
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => {
          removeRedaction(redactionId);
          onClose();
        }}
        className="w-full px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
      >
        Изтрий заличаването
      </button>
    </div>
  );
};
