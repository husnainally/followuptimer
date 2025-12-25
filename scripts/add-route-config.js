const fs = require('fs');
const path = require('path');

const routeConfig = `// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
`;

function addConfigToFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has the config
    if (content.includes('export const dynamic = "force-dynamic"')) {
      console.log(`Skipping ${filePath} - already has config`);
      return;
    }
    
    // Find the last import statement
    const importRegex = /^import .+ from .+;$/gm;
    const imports = content.match(importRegex);
    
    if (!imports || imports.length === 0) {
      console.log(`Skipping ${filePath} - no imports found`);
      return;
    }
    
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertIndex = lastImportIndex + lastImport.length;
    
    // Insert config after last import
    const newContent = 
      content.slice(0, insertIndex) + 
      '\n\n' + 
      routeConfig + 
      content.slice(insertIndex);
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Added config to ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function findRouteFiles(dir) {
  const files = [];
  
  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name === 'route.ts') {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(dir);
  return files;
}

const apiDir = path.join(process.cwd(), 'app', 'api');
const routeFiles = findRouteFiles(apiDir);

console.log(`Found ${routeFiles.length} route files`);
routeFiles.forEach(addConfigToFile);
console.log('Done!');

