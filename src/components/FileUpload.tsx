import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { pdfEngine } from '@/lib/pdfEngine';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const FileUpload: React.FC = () => {
  const { setFile, setNumPages, setError, setProcessing } = useDocumentStore();

  const handleFileChange = useCallback(
    async (file: File | null) => {
      if (!file) return;

      // Validation
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Моля, качете PDF файл');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('Файлът е твърде голям (макс. 25MB)');
        return;
      }

      setError(null);
      setProcessing(true);

      try {
        // Load PDF
        const numPages = await pdfEngine.loadDocument(file);
        setFile(file);
        setNumPages(numPages);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Грешка при зареждане');
      } finally {
        setProcessing(false);
      }
    },
    [setFile, setNumPages, setError, setProcessing]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileChange(files[0]);
      }
    },
    [handleFileChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
    >
      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-12 h-12 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-500">
            <span className="font-semibold">Кликнете за качване</span> или
            плъзнете файл
          </p>
          <p className="text-xs text-gray-500">PDF (макс. 25MB)</p>
        </div>
        <input
          type="file"
          className="hidden"
          accept=".pdf"
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
};
