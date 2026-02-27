import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Toolbar } from '@/components/Toolbar';
import { PDFViewer } from '@/components/PDFViewer';
import { Sidebar } from '@/components/Sidebar';
import { ExportModal } from '@/components/ExportModal';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { Download, AlertCircle } from 'lucide-react';

function App() {
  const { file, error, isProcessing, redactions, textAnnotations, imageAnnotations } =
    useDocumentStore();
  const [showExportModal, setShowExportModal] = useState(false);

  const hasChanges =
    redactions.length > 0 || textAnnotations.length > 0 || imageAnnotations.length > 0;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              PDF Redaction Tool
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Сигурно заличаване на подписи и добавяне на анотации
            </p>
          </div>

          {file && (
            <button
              onClick={() => setShowExportModal(true)}
              disabled={isProcessing || !hasChanges}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={20} />
              <span>Експортирай PDF</span>
            </button>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!file ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <FileUpload />
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Как работи инструментът?
              </h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Качете PDF документ (до 25MB)</li>
                <li>Изберете инструмент "Заличаване" и маркирайте подписи</li>
                <li>Добавете текст или изображения при нужда</li>
                <li>
                  Експортирайте в <strong>Сигурен режим</strong> за гарантирано
                  заличаване
                </li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <>
          <Toolbar />
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <PDFViewer />
            </div>
            <Sidebar />
          </div>
        </>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="text-lg font-medium">Обработване...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
