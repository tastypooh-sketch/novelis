
import type { EditorSettings } from '../types';

export const hexToRgb = (hex: string): [number, number, number] | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [ parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16) ] : null;
};

export const isColorLight = (hexColor: string | undefined): boolean => {
    if (!hexColor) return true;
    const rgb = hexToRgb(hexColor);
    if (!rgb) return true;
    const [r, g, b] = rgb;
    // Improved luminance calculation using linear RGB for better accuracy
    // Standard relative luminance formula (WCAG 2.0)
    const normalize = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const luminance = 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
    return luminance > 0.179; // Standard threshold for white vs black text
};

export const getContrastColor = (hexColor: string | undefined): string => {
    return isColorLight(hexColor) ? '#111827' : '#FFFFFF';
};

/**
 * Harmonizes a source color with a theme color to create a subtle, pleasing version.
 * Reduces saturation and adjusts lightness to be "subtle" but still distinct.
 */
export const harmonizeColor = (sourceHex: string, themeHex: string, isDarkMode: boolean): string => {
    const sourceRgb = hexToRgb(sourceHex);
    const themeRgb = hexToRgb(themeHex);
    if (!sourceRgb || !themeRgb) return sourceHex;

    let [sh, ss, sl] = rgbToHsl(sourceRgb[0], sourceRgb[1], sourceRgb[2]);
    const [, , tl] = rgbToHsl(themeRgb[0], themeRgb[1], themeRgb[2]);

    // BOOST saturation and luminance for vibrancy, avoiding muted/muddy results
    ss = Math.min(1.0, ss * 1.5); // Boost saturation
    
    // Adjust lightness to be distinct from the theme but still vibrant
    let targetL = sl;
    if (isDarkMode) {
        // In dark mode, ensure it's not too dark to lose the hue
        targetL = Math.max(0.25, Math.min(0.45, sl));
    } else {
        // In light mode, ensure it's distinct enough
        targetL = Math.max(0.80, Math.min(0.95, sl));
    }

    // Harmonize slightly with theme but maintain its own character
    targetL = (targetL * 0.8) + (tl * 0.2);

    return hslToHex(sh, ss, targetL);
};

export const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
};

export const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

export const hslToHex = (h: number, s: number, l: number): string => {
    const [r, g, b] = hslToRgb(h, s, l);
    const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const shadeColor = (color: string, percent: number): string => {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    let [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    l += percent / 100;
    l = Math.max(0, Math.min(1, l));
    return hslToHex(h, s, l);
};

export const getImageColor = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas context failed'));
                
                const size = 64;
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);
                
                const imageData = ctx.getImageData(0, 0, size, size).data;
                const colorCounts: { [key: string]: { count: number, original: [number, number, number], saturation: number } } = {};
                const quantization = 32;

                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2];
                    
                    if (imageData[i+3] < 128) continue; // skip transparent pixels
                    if (r > 245 && g > 245 && b > 245) continue; // skip whites
                    if (r < 10 && g < 10 && b < 10) continue; // skip blacks
                    
                    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
                    if (saturation < 30) continue; // Skip greyish/muted colors

                    const qr = Math.round(r / quantization) * quantization;
                    const qg = Math.round(g / quantization) * quantization;
                    const qb = Math.round(b / quantization) * quantization;
                    
                    const key = `${qr},${qg},${qb}`;
                    if (!colorCounts[key]) {
                        colorCounts[key] = { count: 0, original: [r, g, b], saturation };
                    }
                    colorCounts[key].count++;
                }

                // Sort by a combination of frequency and saturation to favor vibrant colors
                const sortedKeys = Object.keys(colorCounts).sort((a, b) => {
                    const scoreA = colorCounts[a].count * (1 + colorCounts[a].saturation / 255);
                    const scoreB = colorCounts[b].count * (1 + colorCounts[b].saturation / 255);
                    return scoreB - scoreA;
                });
                
                const toHex = (rgb: [number, number, number]) => {
                    return `#${('0' + rgb[0].toString(16)).slice(-2)}${('0' + rgb[1].toString(16)).slice(-2)}${('0' + rgb[2].toString(16)).slice(-2)}`;
                };

                const imageColor = sortedKeys.length > 0 ? toHex(colorCounts[sortedKeys[0]].original) : '#374151';

                resolve(imageColor);
            } catch (e: any) {
                if (e.name === 'SecurityError') {
                    reject(new Error('CORS restriction prevents extracting colors from this image.'));
                } else {
                    reject(e);
                }
            }
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
        img.src = imageUrl;
    });
};

export const getTileColorsFromImage = (imageUrl: string): Promise<{ primary: string, accent: string }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas context failed'));
                
                const size = 64;
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);
                
                const imageData = ctx.getImageData(0, 0, size, size).data;
                const colorCounts: { [key: string]: { count: number, original: [number, number, number] } } = {};
                const quantization = 32;

                for (let i = 0; i < imageData.length; i += 4) {
                    if (imageData[i + 3] < 128) continue;
                    const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2];
                    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
                    if (saturation < 25) continue; 

                    const qr = Math.round(r / quantization) * quantization;
                    const qg = Math.round(g / quantization) * quantization;
                    const qb = Math.round(b / quantization) * quantization;
                    const key = `${qr},${qg},${qb}`;

                    if (!colorCounts[key]) {
                        colorCounts[key] = { count: 0, original: [r, g, b] };
                    }
                    colorCounts[key].count++;
                }

                const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b].count - colorCounts[a].count);
                
                if (sortedColors.length === 0) {
                    resolve({ primary: '#374151', accent: '#4A90E2' });
                    return;
                }

                const dominantRgb = colorCounts[sortedColors[0]].original;
                const [r, g, b] = dominantRgb;
                const [h, s, l] = rgbToHsl(r, g, b);
                const primary = hslToHex(h, s, l);

                let accentH = h;
                let accentS = s;
                let accentL = l;

                if (sortedColors.length > 1) {
                    const accentRgb = colorCounts[sortedColors[1]].original;
                    const [ah, as, al] = rgbToHsl(accentRgb[0], accentRgb[1], accentRgb[2]);
                    if (Math.abs(al - l) > 0.15 || Math.abs(ah - h) > 0.15) {
                        accentH = ah;
                        accentS = as;
                        accentL = al;
                    } else {
                        accentH = (h + 0.3) % 1;
                        accentS = Math.max(0.6, s);
                        accentL = l < 0.5 ? 0.6 : 0.4;
                    }
                } else {
                    accentH = (h + 0.3) % 1;
                    accentS = Math.max(0.6, s);
                    accentL = l < 0.5 ? 0.6 : 0.4;
                }

                const accent = hslToHex(accentH, Math.max(0.5, accentS), Math.min(0.7, Math.max(0.3, accentL)));

                resolve({ primary, accent });
            } catch (e: any) {
                reject(e);
            }
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
        img.src = imageUrl;
    });
};

export const getImageColors = (imageUrl: string): Promise<Partial<EditorSettings>> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context failed'));
          
          const size = 64; // Increased size for better sampling
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);
          
          const imageData = ctx.getImageData(0, 0, size, size).data;
          const colorCounts: { [key: string]: { count: number, original: [number, number, number] } } = {};
          const quantization = 32;

          for (let i = 0; i < imageData.length; i += 4) {
            if (imageData[i + 3] < 128) continue;

            const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2];
            
            const saturation = Math.max(r, g, b) - Math.min(r, g, b);
            if (saturation < 25) continue; // Skip greyscale colors

            const qr = Math.round(r / quantization) * quantization;
            const qg = Math.round(g / quantization) * quantization;
            const qb = Math.round(b / quantization) * quantization;
            const key = `${qr},${qg},${qb}`;

            if (!colorCounts[key]) {
                colorCounts[key] = { count: 0, original: [r, g, b] };
            }
            colorCounts[key].count++;
          }

          const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b].count - colorCounts[a].count);
          
          if (sortedColors.length === 0) {
              // Fallback to a default dark theme if no suitable colors found
              resolve({ backgroundColor: '#202020', textColor: '#E8E8E8', toolbarBg: '#1E1E1E', toolbarText: '#E8E8E8', toolbarButtonBg: '#333333', toolbarButtonHoverBg: '#454545', toolbarInputBorderColor: '#454545', accentColor: '#4A90E2', accentColorHover: '#357ABD', successColor: '#22c55e', successColorHover: '#16a34a', dangerColor: '#dc2626', dangerColorHover: '#b91c1c', dropdownBg: '#333333' });
              return;
          }

          const dominantRgb = colorCounts[sortedColors[0]].original;
          const [r, g, b] = dominantRgb;
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const isDark = luminance < 0.5;
          const [h, s, l] = rgbToHsl(r, g, b);
          
          const backgroundColor = hslToHex(h, s, l);
          const textColor = isDark ? '#FFFFFF' : '#111827';
          const toolbarText = textColor;

          const toolbarBg = hslToHex(h, s, isDark ? Math.max(0, l - 0.05) : Math.min(1, l + 0.05));
          const toolbarButtonBg = hslToHex(h, s, isDark ? Math.max(0, l + 0.05) : Math.min(1, l - 0.05));
          const toolbarButtonHoverBg = hslToHex(h, s, isDark ? Math.max(0, l + 0.1) : Math.min(1, l - 0.1));
          const toolbarInputBorderColor = toolbarButtonHoverBg;
          const dropdownBg = toolbarButtonBg;
          
          let accentH = h;
          if (sortedColors.length > 1) {
              const accentRgb = colorCounts[sortedColors[1]].original;
              const [accentHue, , accentLum] = rgbToHsl(accentRgb[0], accentRgb[1], accentRgb[2]);
              if (Math.abs(accentLum - l) > 0.15 || Math.abs(accentHue - h) > 0.15) {
                  accentH = accentHue;
              } else {
                  accentH = (h + 0.3) % 1; // Shift hue if too similar
              }
          } else {
              accentH = (h + 0.3) % 1; // Shift hue if only one color found
          }
          
          const accentS = Math.max(0.45, s);
          const accentL = isDark ? 0.60 : 0.40;
          const accentColor = hslToHex(accentH, accentS, accentL);
          const accentColorHover = hslToHex(accentH, accentS, accentL - 0.08);

          const successColor = '#16a34a';
          const successColorHover = '#15803d';
          const dangerColor = '#be123c';
          const dangerColorHover = '#9f1239';
          
          resolve({ 
              backgroundColor, textColor, toolbarBg, toolbarText, toolbarButtonBg,
              toolbarButtonHoverBg, toolbarInputBorderColor, accentColor, accentColorHover,
              successColor, successColorHover, dangerColor, dangerColorHover, dropdownBg,
          });
      } catch (e: any) {
          if (e.name === 'SecurityError') {
              reject(new Error('CORS restriction prevents extracting colors from this image.'));
          } else {
              reject(e);
          }
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image for theme extraction: ${imageUrl}`));
    img.src = imageUrl;
  });
};
