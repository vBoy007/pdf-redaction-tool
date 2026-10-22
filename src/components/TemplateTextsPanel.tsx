import React from 'react';
import { FileText } from 'lucide-react';

interface TemplateTextsPanelProps {
  onSelectTemplate: (text: string) => void;
}

export const TemplateTextsPanel: React.FC<TemplateTextsPanelProps> = ({ onSelectTemplate }) => {
  const templates = [
    {
      title: 'Множествено число',
      text: 'Подписите са заличени на основание чл.1, ал.1 и ал.3 от ЗЗЛД',
      icon: '📝',
    },
    {
      title: 'Единствено число',
      text: 'Подписът е заличен на основание чл. 1, ал.1 и ал.3 от ЗЗЛД',
      icon: '✍️',
    },
    {
      title: 'Кратка форма',
      text: 'Заличено на основание чл.1, ал.1 и ал.3 от ЗЗЛД',
      icon: '🔒',
    },
	{
      title: 'ВЪВ ВРЪЗКА С ЧЛ.37 ОТ ЗОП',
      text: 'Заличено на основание чл.1, ал.1 и ал.3 от ЗЗЛД, във връзка с чл.37 от ЗОП',
      icon: '3️⃣7️⃣',
    },
	{
      title: 'НА ОСНОВАНИЕ ЧЛ.59',
      text: 'Заличено на основание чл.59, ал. 3 и ал.4, във връзка с чл.45, ал.1, т.3 от ЗЗЛД',
      icon: '5️⃣9️⃣ ',
    },
	{
      title: 'НА ОСНОВАНИЕ ЧЛ.72',
      text: 'Заличено на основание чл.72 от ДОПК, във връзка с чл.37 от ЗОП',
      icon: '7️⃣2️⃣',
    },
  ];

  return (
    <div className="template-panel absolute bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50"
      style={{
        top: '80px',
        left: '20px',
        maxWidth: '350px',
      }}
    >
      <div className="flex items-center mb-3">
        <FileText size={16} className="mr-2 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-700">Шаблони ЗЗЛД/ЗОП/ДОПК</h3>
      </div>

      <div className="space-y-2">
        {templates.map((template, index) => (
          <button
            key={index}
            onClick={() => onSelectTemplate(template.text)}
            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
          >
            <div className="flex items-start">
              <span className="text-2xl mr-2">{template.icon}</span>
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-600 mb-1">
                  {template.title}
                </div>
                <div className="text-xs text-gray-700 leading-relaxed">
                  {template.text}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Click за използване на шаблон
        </div>
      </div>
    </div>
  );
};
