import React from 'react';
import { Download } from 'lucide-react';
import { downloadChartAsPng } from '../lib/chartExport';
import { useLanguage } from '../context/LanguageContext';

interface ChartDownloadButtonProps {
  elementRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
}

export const ChartDownloadButton: React.FC<ChartDownloadButtonProps> = ({ elementRef, filename }) => {
  const { language } = useLanguage();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (elementRef.current) {
      downloadChartAsPng(elementRef.current, filename);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="p-2 transition-all rounded-xl hover:bg-primary/10 text-on-surface-variant hover:text-primary flex items-center justify-center group download-button-hide"
      title={language === 'ar' ? 'تحميل كصورة' : 'Download as Image'}
    >
      <Download className="w-5 h-5" />
    </button>
  );
};
