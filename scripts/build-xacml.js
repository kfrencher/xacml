#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_GEN_DIR = path.join(__dirname, '..', 'src-gen');
const BUILD_DIR = path.join(__dirname, '..', 'build');

/**
 * Format XML string with proper indentation while preserving inline text content
 * @param {string} xmlString - The XML string to format
 * @returns {string} - Formatted XML string
 */
function formatXML(xmlString) {
  const result = [];
  let indentLevel = 0;
  let i = 0;
  
  while (i < xmlString.length) {
    const tagStart = xmlString.indexOf('<', i);
    
    if (tagStart === -1) {
      break;
    }
    
    // Check if there's text content before the tag
    if (tagStart > i) {
      const textContent = xmlString.substring(i, tagStart);
      if (textContent.trim()) {
        // This is text content that should be preserved inline
        // We'll handle this when we process the containing element
      }
    }
    
    const tagEnd = xmlString.indexOf('>', tagStart);
    if (tagEnd === -1) break;
    
    const fullTag = xmlString.substring(tagStart, tagEnd + 1);
    
    // Handle different types of tags
    if (fullTag.startsWith('<?') || fullTag.startsWith('<!--')) {
      // XML declaration or comment
      result.push(fullTag);
    } else if (fullTag.startsWith('</')) {
      // Closing tag
      indentLevel--;
      result.push('  '.repeat(indentLevel) + fullTag);
    } else if (fullTag.endsWith('/>')) {
      // Self-closing tag
      result.push('  '.repeat(indentLevel) + fullTag);
    } else {
      // Opening tag - check if it contains inline text content
      const tagNameMatch = fullTag.match(/^<([\w:-]+)/);
      const tagName = tagNameMatch ? tagNameMatch[1] : null;
      if(tagName == null) {
        throw new Error('Failed to extract tag name from XML.');
      }

      const closingTagStart = xmlString.indexOf(`</${tagName}>`, tagEnd + 1);
      
      if (closingTagStart !== -1) {
        // Check what's between opening and closing tag
        const innerContent = xmlString.substring(tagEnd + 1, closingTagStart);
        const hasOnlyText = !innerContent.includes('<');
        
        if (hasOnlyText && innerContent.trim()) {
          // This element contains only text content - keep it inline
          const closingTag = `</${tagName}>`;
          const fullElement = fullTag + innerContent + closingTag;
          result.push('  '.repeat(indentLevel) + fullElement);
          
          // Skip past the closing tag
          i = closingTagStart + closingTag.length;
          continue;
        }
      }
      
      // Regular opening tag with child elements
      result.push('  '.repeat(indentLevel) + fullTag);
      indentLevel++;
    }
    
    i = tagEnd + 1;
  }
  
  return result.join('\n');
}

/**
 * Transform XACML by removing xacml3 namespace prefix
 * @param {string} xmlContent - The XML content to transform
 * @returns {string} - Transformed XML content
 */
function transformXacmlNamespace(xmlContent) {
  // Remove the xmlns:xacml3 namespace declaration
  let transformed = xmlContent.replace(/xmlns:xacml3="[^"]*"/g, '');
  
  // Replace all xacml3: prefixes with empty string (default namespace)
  transformed = transformed.replace(/xacml3:/g, '');
  
  // Add the default XACML namespace
  transformed = transformed.replace(
    /<PolicySet /,
    '<PolicySet xmlns="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17" '
  );
  
  // Clean up any double spaces that might result from removing the namespace
  transformed = transformed.replace(/\s+/g, ' ');
  
  return transformed;
}

/**
 * Process a single XML file
 * @param {string} srcPath - Source file path
 * @param {string} destPath - Destination file path
 */
async function processXmlFile(srcPath, destPath) {
  try {
    console.log(`Processing: ${path.basename(srcPath)}`);
    
    // Read the source file
    const xmlContent = await fs.readFile(srcPath, 'utf-8');
    
    // Transform namespace
    const transformedContent = transformXacmlNamespace(xmlContent);
    
    // Format the XML
    const formattedContent = formatXML(transformedContent);
    
    // Ensure destination directory exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    
    // Write the processed file
    await fs.writeFile(destPath, formattedContent, 'utf-8');
    
    console.log(`✅ Processed: ${path.basename(srcPath)} -> ${path.basename(destPath)}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error processing ${srcPath}:`, errorMessage);
    throw error;
  }
}

/**
 * Main function to build XACML files
 */
async function buildXacmlFiles() {
  try {
    console.log('🚀 Starting XACML build process...');
    console.log(`📂 Source: ${SRC_GEN_DIR}`);
    console.log(`📂 Target: ${BUILD_DIR}`);
    
    // Check if src-gen directory exists
    try {
      await fs.access(SRC_GEN_DIR);
    } catch (error) {
      console.error(`❌ Source directory not found: ${SRC_GEN_DIR}`);
      process.exit(1);
    }
    
    // Clean build directory
    try {
      await fs.rm(BUILD_DIR, { recursive: true, force: true });
      console.log('🧹 Cleaned build directory');
    } catch (error) {
      // Directory might not exist, that's fine
    }
    
    // Create build directory
    await fs.mkdir(BUILD_DIR, { recursive: true });
    
    // Read all files from src-gen
    const files = await fs.readdir(SRC_GEN_DIR);
    const xmlFiles = files.filter(file => file.endsWith('.xml'));
    
    if (xmlFiles.length === 0) {
      console.log('⚠️  No XML files found in src-gen directory');
      return;
    }
    
    console.log(`📋 Found ${xmlFiles.length} XML files to process`);
    
    // Process each XML file
    for (const xmlFile of xmlFiles) {
      const srcPath = path.join(SRC_GEN_DIR, xmlFile);
      const destPath = path.join(BUILD_DIR, xmlFile);
      
      await processXmlFile(srcPath, destPath);
    }
    
    console.log('✅ XACML build completed successfully!');
    console.log(`📦 Built files are in: ${BUILD_DIR}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Build failed:', errorMessage);
    process.exit(1);
  }
}

// Run the build process
buildXacmlFiles();