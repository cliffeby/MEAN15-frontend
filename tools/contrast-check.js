// Simple contrast checker script
// Usage: node tools/contrast-check.js

function hexToRgb(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) {
    hex = hex.split('').map(h => h + h).join('');
  }
  const bigint = parseInt(hex, 16);
  return [ (bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255 ];
}

function srgbToLin(c) {
  c = c / 255;
  if (c <= 0.03928) return c / 12.92;
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(rgb) {
  const r = srgbToLin(rgb[0]);
  const g = srgbToLin(rgb[1]);
  const b = srgbToLin(rgb[2]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fgRgb, bgRgb) {
  const L1 = luminance(fgRgb);
  const L2 = luminance(bgRgb);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function compositeOver(fgRgb, alpha, bgRgb) {
  return [
    Math.round(alpha * fgRgb[0] + (1 - alpha) * bgRgb[0]),
    Math.round(alpha * fgRgb[1] + (1 - alpha) * bgRgb[1]),
    Math.round(alpha * fgRgb[2] + (1 - alpha) * bgRgb[2])
  ];
}

function checkPair(fg, bg, fgIsHex=true, bgIsHex=true, alpha=null, label=''){
  const fgRgb = fgIsHex ? hexToRgb(fg) : fg; 
  const bgRgb = bgIsHex ? hexToRgb(bg) : bg;
  let effectiveFg = fgRgb;
  if (alpha !== null) {
    effectiveFg = compositeOver(fgRgb, alpha, bgRgb);
  }
  const ratio = contrastRatio(effectiveFg, bgRgb);
  console.log(`${label}: fg=${alpha!==null? `${fg}+alpha=${alpha}`:fg} bg=${bg} -> ratio=${ratio.toFixed(2)}`);
  console.log(`  WCAG AA (normal): ${ratio >= 4.5 ? 'PASS' : 'FAIL'}; AA (large): ${ratio >= 3 ? 'PASS' : 'FAIL'}; AAA (normal): ${ratio >= 7 ? 'PASS' : 'FAIL'}`);
}

// Colors from member-list dark theme
const bg = '#0f1113';
const text = '#e6eef8';
const placeholderAlpha = 0.65; // rgba overlay used
const placeholderFg = '#e6eef8';
// Updated to match dark-theme primary in member-list.scss
const primaryButtonBg = '#0d47a1';
const primaryButtonText = '#ffffff';

console.log('Running contrast checks for member-list dark theme...');
checkPair(text, bg, true, true, null, 'Body text on background');
checkPair(placeholderFg, bg, true, true, placeholderAlpha, 'Placeholder (65% opacity) on background');
checkPair(primaryButtonText, primaryButtonBg, true, true, null, 'Primary button text on primary button bg');
checkPair(text, primaryButtonBg, true, true, null, 'Body text on primary button bg');

// Hover state check: white overlay with alpha composited over base background
const hoverOverlayAlpha = 0.06; // matches SCSS rgba(255,255,255,0.06)
const hoverText = '#8fb2c7';
{
  const bgRgb = hexToRgb(bg);
  const white = [255,255,255];
  const hoverBgRgb = compositeOver(white, hoverOverlayAlpha, bgRgb);
  const hoverRatio = contrastRatio(hexToRgb(hoverText), hoverBgRgb);
  console.log(`Hover state: hoverText=${hoverText} on hoverBg(composite of white @ ${hoverOverlayAlpha} over ${bg}) -> ratio=${hoverRatio.toFixed(2)}`);
  console.log(`  WCAG AA (normal): ${hoverRatio >= 4.5 ? 'PASS' : 'FAIL'}; AA (large): ${hoverRatio >= 3 ? 'PASS' : 'FAIL'}; AAA (normal): ${hoverRatio >= 7 ? 'PASS' : 'FAIL'}`);
}

console.log('Done.');
