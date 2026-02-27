import React, { useState } from 'react';
import { Download, X, Shield } from 'lucide-react';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { exportEngine } from '@/lib/exportEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const {
    file,
    fileName,
    redactions,
    textAnnotations,
    imageAnnotations,
    setProcessing,
    setError,
  } = useDocumentStore();

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!file) return;

    setIsExporting(true);
    setProcessing(true);

    try {
      const blob = await exportEngine.exportPDF({
        file,
        fileName,
        redactions,
        textAnnotations,
        imageAnnotations,
        secureMode: true, // Винаги Secure Mode!
      });

      exportEngine.downloadBlob(blob, fileName);
      onClose(); // Затвори след успешен export
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Грешка при експорт');
    } finally {
      setIsExporting(false);
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Експорт на PDF</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            disabled={isExporting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Secure Mode Info */}
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield size={24} className="text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-sm text-green-900 mb-2">
                  Сигурен режим (100% защита)
                </p>
                <p className="text-xs text-green-800 leading-relaxed mb-2">
                  Конвертира страниците в изображения и гарантира <strong>необратимо заличаване</strong> на подписи и данни.
                </p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>✅ Данните са физически премахнати</li>
                  <li>✅ Невъзможно възстановяване</li>
                  <li>✅ GDPR/HIPAA compliant</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Обобщение:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• {redactions.length} заличавания</li>
              <li>• {textAnnotations.length} текстови анотации</li>
              <li>• {imageAnnotations.length} изображения</li>
            </ul>
          </div>

          {/* File Size Warning */}
          {(textAnnotations.length > 0 || imageAnnotations.length > 0 || redactions.length > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>Забележка:</strong> Файлът може да бъде по-голям, тъй като страниците стават изображения. Това гарантира пълна сигурност.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            disabled={isExporting}
          >
            Отказ
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <span>{isExporting ? 'Обработване...' : 'Експортирай'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
