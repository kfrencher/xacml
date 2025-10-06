/**
 * XML formatting utilities
 */

/**
 * Format XML string with proper indentation
 * @param {string} xml - Raw XML string
 * @param {number} indent - Number of spaces for indentation
 * @returns {string} Formatted XML
 */
function formatXml(xml, indent = 2) {
  const PADDING = ' '.repeat(indent);
  const reg = /(>)(<)(\/*)/g;
  let formatted = xml.replace(reg, '$1\n$2$3');
  
  let pad = 0;
  return formatted.split('\n').map((line) => {
    let indent = 0;
    if (line.match(/.+<\/\w[^>]*>$/)) {
      indent = 0;
    } else if (line.match(/^<\/\w/) && pad > 0) {
      pad -= 1;
    } else if (line.match(/^<\w[^>]*[^\/]>.*$/)) {
      indent = 1;
    } else {
      indent = 0;
    }
    
    const padding = PADDING.repeat(pad);
    pad += indent;
    return padding + line;
  }).join('\n');
}

/**
 * Minify XML by removing unnecessary whitespace
 * @param {string} xml - Formatted XML string
 * @returns {string} Minified XML
 */
function minifyXml(xml) {
  return xml
    .replace(/>\s+</g, '><')
    .replace(/^\s+|\s+$/gm, '')
    .replace(/\n/g, '');
}

export { formatXml, minifyXml };