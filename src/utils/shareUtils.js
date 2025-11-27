import html2canvas from 'html2canvas';

/**
 * Generate an image from a DOM element and share it
 * Falls back to download + clipboard on desktop
 */
export async function shareAsImage({ 
  elementId = 'share-card',
  fileName = 'one-upper-result.png',
  shareTitle = 'One-Upper Result',
  shareText = 'Challenge me on One-Upper!\noneupper.app'
}) {
  try {
    // Get the element to capture
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Share card element not found');
    }

    // Generate canvas from element
    const canvas = await html2canvas(element, {
      backgroundColor: null, // Preserve transparency/gradient
      scale: 2, // Higher resolution for crisp images
      logging: false,
      useCORS: true // Allow cross-origin images (for the mic SVG)
    });

    // Convert canvas to blob
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      }, 'image/png');
    });

    // Create file from blob
    const file = new File([blob], fileName, { type: 'image/png' });

    // Check if Web Share API with files is supported
    const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] });

    if (canShareFiles) {
      // Mobile: Use native share sheet
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: shareText
      });
      return { success: true, method: 'share' };
    } else if (navigator.share) {
      // Desktop with share API but no file support: share text only, download image
      downloadImage(canvas, fileName);
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: 'https://oneupper.app'
      });
      return { success: true, method: 'share-text-download-image' };
    } else {
      // Fallback: Download image + copy text to clipboard
      downloadImage(canvas, fileName);
      await copyToClipboard(shareText);
      return { success: true, method: 'download-copy' };
    }
  } catch (error) {
    // User cancelled share, or other error
    if (error.name === 'AbortError') {
      // User cancelled - not really an error
      return { success: false, method: 'cancelled' };
    }
    console.error('Share failed:', error);
    throw error;
  }
}

/**
 * Download canvas as image file
 */
function downloadImage(canvas, fileName) {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Check if device likely supports native share with images
 * Useful for showing different button text
 */
export function canShareWithImages() {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.canShare) return false;
  
  // Create a dummy file to test
  try {
    const testFile = new File(['test'], 'test.png', { type: 'image/png' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}