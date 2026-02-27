import React from 'react';
import { Trash2, Square, Type, Image as ImageIcon } from 'lucide-react';
import { useDocumentStore } from '@/stores/useDocumentStore';

export const Sidebar: React.FC = () => {
  const {
    redactions,
    textAnnotations,
    imageAnnotations,
    removeRedaction,
    removeTextAnnotation,
    removeImageAnnotation,
    setCurrentPage,
  } = useDocumentStore();

  const totalItems =
    redactions.length + textAnnotations.length + imageAnnotations.length;

  if (totalItems === 0) {
    return (
      <div className="w-64 bg-gray-50 border-l border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Промени</h3>
        <p className="text-xs text-gray-500">
          Няма добавени промени. Използвайте инструментите за добавяне на
          заличавания, текст или изображения.
        </p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Промени ({totalItems})
      </h3>

      {/* Redactions */}
      {redactions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center">
            <Square size={14} className="mr-1" />
            Заличавания ({redactions.length})
          </h4>
          <div className="space-y-2">
            {redactions.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm"
              >
                <button
                  onClick={() => setCurrentPage(r.pageNumber)}
                  className="flex-1 text-left"
                >
                  <p className="text-xs font-medium">Страница {r.pageNumber}</p>
                  <p className="text-xs text-gray-500">
                    {Math.round(r.width)} × {Math.round(r.height)} px
                  </p>
                </button>
                <button
                  onClick={() => removeRedaction(r.id)}
                  className="p-1 hover:bg-red-100 rounded"
                  title="Изтрий"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Annotations */}
      {textAnnotations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center">
            <Type size={14} className="mr-1" />
            Текст ({textAnnotations.length})
          </h4>
          <div className="space-y-2">
            {textAnnotations.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm"
              >
                <button
                  onClick={() => setCurrentPage(t.pageNumber)}
                  className="flex-1 text-left"
                >
                  <p className="text-xs font-medium">Страница {t.pageNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{t.text}</p>
                </button>
                <button
                  onClick={() => removeTextAnnotation(t.id)}
                  className="p-1 hover:bg-red-100 rounded"
                  title="Изтрий"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Annotations */}
      {imageAnnotations.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center">
            <ImageIcon size={14} className="mr-1" />
            Картинки ({imageAnnotations.length})
          </h4>
          <div className="space-y-2">
            {imageAnnotations.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm"
              >
                <button
                  onClick={() => setCurrentPage(i.pageNumber)}
                  className="flex-1 text-left"
                >
                  <p className="text-xs font-medium">Страница {i.pageNumber}</p>
                  <p className="text-xs text-gray-500">
                    {Math.round(i.width)} × {Math.round(i.height)} px
                  </p>
                </button>
                <button
                  onClick={() => removeImageAnnotation(i.id)}
                  className="p-1 hover:bg-red-100 rounded"
                  title="Изтрий"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
