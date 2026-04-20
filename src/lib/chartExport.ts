import { toPng } from 'html-to-image';
import { toast } from 'sonner';

/**
 * Downloads a DOM element as a PNG image.
 * @param elementId The ID of the element or the HTML element itself.
 * @param filename The name of the file to be saved.
 */
export const downloadChartAsPng = async (element: HTMLElement | string, filename: string = 'chart') => {
  const target = typeof element === 'string' ? document.getElementById(element) : element;
  
  if (!target) {
    console.error('Target element not found for chart export');
    return;
  }

  try {
    const dataUrl = await toPng(target, {
      cacheBust: true,
      filter: (node: any) => {
        // Hide elements that shouldn't be in the export
        if (node.classList && (node.classList.contains('download-button-hide') || node.tagName === 'BUTTON')) {
          return false;
        }

        // Filter out link elements that point to external stylesheets to avoid CORS issues
        if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
          const href = node.href;
          if (href && !href.startsWith(window.location.origin)) {
            return false;
          }
        }
        return true;
      },
      style: {
        borderRadius: '0px', // Ensure it captures correctly if it's a card
      }
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
    
    toast.success('Chart downloaded successfully');
  } catch (err) {
    console.error('Failed to download chart:', err);
    toast.error('Failed to download chart as image');
  }
};
