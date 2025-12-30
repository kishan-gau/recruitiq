#!/usr/bin/env ts-node
/**
 * Script to fix TS2339 errors by adding property declarations to classes
 * 
 * This script:
 * 1. Finds all classes with properties assigned in constructor
 * 2. Extracts property assignments
 * 3. Adds proper property declarations at class level
 * 
 * Industry Standard: TypeScript Migration Tool
 */

import * as fs from 'fs';
import * as path from 'path';

interface PropertyInfo {
  name: string;
  type: string;
}

/**
 * Extract properties assigned in constructor
 */
function extractConstructorProperties(fileContent: string, className: string): PropertyInfo[] {
  const properties: PropertyInfo[] = [];
  const constructorRegex = /constructor\s*\([^)]*\)\s*\{([^}]*)\}/s;
  const match = fileContent.match(constructorRegex);
  
  if (!match) return properties;
  
  const constructorBody = match[1];
  
  // Match this.propertyName = value patterns
  const propertyRegex = /this\.(\w+)\s*=\s*([^;]+);/g;
  let propMatch;
  
  while ((propMatch = propertyRegex.exec(constructorBody)) !== null) {
    const propName = propMatch[1];
    const propValue = propMatch[2].trim();
    
    // Infer type from assignment
    let type = 'any';
    if (propValue.includes('process.env')) {
      if (propValue.includes("=== 'true'")) {
        type = 'boolean';
      } else if (propValue.includes('||')) {
        const defaultValue = propValue.split('||')[1].trim();
        if (defaultValue.startsWith("'") || defaultValue.startsWith('"')) {
          type = 'string';
        } else if (!isNaN(Number(defaultValue))) {
          type = 'number';
        }
      } else {
        type = 'string | undefined';
      }
    } else if (propValue === 'null') {
      type = 'any';
    } else if (propValue === 'true' || propValue === 'false') {
      type = 'boolean';
    } else if (!isNaN(Number(propValue))) {
      type = 'number';
    } else if (propValue.startsWith('[')) {
      type = 'any[]';
    } else if (propValue.startsWith('{')) {
      type = 'Record<string, any>';
    }
    
    properties.push({ name: propName, type });
  }
  
  return properties;
}

/**
 * Add property declarations to class
 */
function addPropertyDeclarations(fileContent: string, className: string): string {
  const properties = extractConstructorProperties(fileContent, className);
  
  if (properties.length === 0) return fileContent;
  
  // Find class declaration
  const classRegex = new RegExp(`(class\\s+${className}\\s*(?:extends\\s+[\\w<>]+\\s*)?\\{)`, 's');
  const match = fileContent.match(classRegex);
  
  if (!match) return fileContent;
  
  // Generate property declarations
  const declarations = properties
    .map(p => `  ${p.name}: ${p.type};`)
    .join('\n');
  
  // Insert declarations after class opening brace
  const result = fileContent.replace(
    classRegex,
    `$1\n${declarations}\n`
  );
  
  return result;
}

/**
 * Process a single TypeScript file
 */
function processFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Find all class names in the file
    const classRegex = /class\s+(\w+)/g;
    let modified = content;
    let hasChanges = false;
    
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const newContent = addPropertyDeclarations(modified, className);
      if (newContent !== modified) {
        modified = newContent;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, modified, 'utf-8');
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error);
    return false;
  }
}

/**
 * Recursively find all TypeScript files
 */
function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !['node_modules', 'dist', 'coverage'].includes(entry.name)) {
        files.push(...findTypeScriptFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

// Main execution
const srcDir = path.join(__dirname, '../src');
console.log('Finding TypeScript files...');
const tsFiles = findTypeScriptFiles(srcDir);
console.log(`Found ${tsFiles.length} TypeScript files\n`);

let fixed = 0;
for (const file of tsFiles) {
  if (processFile(file)) {
    fixed++;
  }
}

console.log(`\n✓ Fixed ${fixed} files`);
console.log('✓ Property declarations added to classes');
console.log('\nNext steps:');
console.log('1. Run: npm run build');
console.log('2. Fix any remaining errors manually');
console.log('3. Run: npm run test');
