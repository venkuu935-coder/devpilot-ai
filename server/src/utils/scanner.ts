import fs from 'fs';
import path from 'path';

export interface ScanResult {
  fileCount: number;
  totalSize: number;
  detectedLanguage: string;
  detectedFramework: string;
  dependencies: Record<string, string>;
  detectedDatabase: string;
  apiFramework: string;
  summary: string;
  fileStructure: string[];
}

// Recursively traverse directory to find files
async function getFilesRecursively(dir: string, baseDir: string = dir): Promise<{ relativePath: string; absolutePath: string; size: number }[]> {
  const result: { relativePath: string; absolutePath: string; size: number }[] = [];
  if (!fs.existsSync(dir)) return result;

  const items = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const resPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      // Exclude build/dependency outputs to optimize scans
      if (['node_modules', 'dist', 'build', '.git', '.next', 'bin', 'obj', 'vendor', '__pycache__', '.env', '.venv'].includes(item.name)) {
        continue;
      }
      const subFiles = await getFilesRecursively(resPath, baseDir);
      result.push(...subFiles);
    } else {
      const stat = await fs.promises.stat(resPath);
      result.push({
        relativePath: path.relative(baseDir, resPath).replace(/\\/g, '/'),
        absolutePath: resPath,
        size: stat.size,
      });
    }
  }
  return result;
}

// Format byte size to readable metrics
function formatSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function scanRepository(projectPath: string): Promise<ScanResult> {
  const allFiles = await getFilesRecursively(projectPath);
  const fileCount = allFiles.length;
  const totalSize = allFiles.reduce((acc, curr) => acc + curr.size, 0);
  const fileStructure = allFiles.map(f => f.relativePath);

  // 1. Programming Language Detection
  const extCounts: Record<string, number> = {};
  for (const f of allFiles) {
    const ext = path.extname(f.relativePath).toLowerCase();
    if (ext) {
      extCounts[ext] = (extCounts[ext] || 0) + 1;
    }
  }

  const langMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.py': 'Python',
    '.java': 'Java',
    '.go': 'Go',
    '.rs': 'Rust',
    '.cpp': 'C++',
    '.cc': 'C++',
    '.c': 'C',
    '.h': 'C/C++',
    '.cs': 'C#',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.html': 'HTML/Web',
    '.css': 'CSS',
  };

  const langCounts: Record<string, number> = {};
  for (const [ext, count] of Object.entries(extCounts)) {
    const lang = langMap[ext];
    if (lang) {
      langCounts[lang] = (langCounts[lang] || 0) + count;
    }
  }

  let detectedLanguage = 'Unknown';
  let maxCount = 0;
  for (const [lang, count] of Object.entries(langCounts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedLanguage = lang;
    }
  }

  // 2. Dependencies parsing
  let dependencies: Record<string, string> = {};

  // Check package.json (Node.js)
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf8');
      const pkg = JSON.parse(content);
      dependencies = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      if (detectedLanguage === 'Unknown' || detectedLanguage === 'JavaScript') {
        detectedLanguage = pkg.devDependencies?.typescript || pkg.dependencies?.typescript ? 'TypeScript' : 'JavaScript';
      }
    } catch (e) {
      console.warn('Failed to parse package.json dependencies', e);
    }
  }

  // Check requirements.txt (Python)
  const reqTxtPath = path.join(projectPath, 'requirements.txt');
  if (fs.existsSync(reqTxtPath)) {
    try {
      const lines = fs.readFileSync(reqTxtPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([a-zA-Z0-9\-_]+)\s*(?:==|>=|<=|>|<|~=)?\s*([0-9a-zA-Z\-_.*]+)?/);
        if (match) {
          dependencies[match[1]] = match[2] || 'any';
        }
      }
      if (detectedLanguage === 'Unknown') detectedLanguage = 'Python';
    } catch (e) {
      console.warn('Failed to parse requirements.txt', e);
    }
  }

  // Check go.mod (Go)
  const goModPath = path.join(projectPath, 'go.mod');
  if (fs.existsSync(goModPath)) {
    try {
      const lines = fs.readFileSync(goModPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('require')) {
          const match = trimmed.match(/require\s+([a-zA-Z0-9.\-_/]+)\s+([a-zA-Z0-9.\-_+]+)/);
          if (match) {
            dependencies[match[1]] = match[2];
          }
        } else {
          // check if we are in block
          const match = trimmed.match(/^([a-zA-Z0-9.\-_/]+)\s+([a-zA-Z0-9.\-_+]+)/);
          if (match && !trimmed.startsWith('module') && !trimmed.startsWith('go ')) {
            dependencies[match[1]] = match[2];
          }
        }
      }
      detectedLanguage = 'Go';
    } catch (e) {
      console.warn('Failed to parse go.mod', e);
    }
  }

  // Check Cargo.toml (Rust)
  const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
  if (fs.existsSync(cargoTomlPath)) {
    try {
      const content = fs.readFileSync(cargoTomlPath, 'utf8');
      const depSection = content.split('[dependencies]');
      if (depSection.length > 1) {
        const lines = depSection[1].split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('#')) break; // Next section starts
          const match = trimmed.match(/^([a-zA-Z0-9\-_]+)\s*=\s*(?:"([^"]+)"|\{([^}]+)\})/);
          if (match) {
            dependencies[match[1]] = match[2] || 'custom';
          }
        }
      }
      detectedLanguage = 'Rust';
    } catch (e) {
      console.warn('Failed to parse Cargo.toml', e);
    }
  }

  // Check Java Maven/Gradle manifests
  const pomXmlPath = path.join(projectPath, 'pom.xml');
  if (fs.existsSync(pomXmlPath)) {
    try {
      const content = fs.readFileSync(pomXmlPath, 'utf8');
      const depRegex = /<dependency>[\s\S]*?<groupId>([\s\S]*?)<\/groupId>[\s\S]*?<artifactId>([\s\S]*?)<\/artifactId>(?:[\s\S]*?<version>([\s\S]*?)<\/version>)?[\s\S]*?<\/dependency>/g;
      let match;
      while ((match = depRegex.exec(content)) !== null) {
        const artifactId = match[2].trim();
        const version = match[3] ? match[3].trim() : 'latest';
        dependencies[artifactId] = version;
      }
      detectedLanguage = 'Java';
    } catch (e) {
      console.warn('Failed to parse pom.xml', e);
    }
  }

  const buildGradlePath = path.join(projectPath, 'build.gradle');
  if (fs.existsSync(buildGradlePath)) {
    try {
      const lines = fs.readFileSync(buildGradlePath, 'utf8').split('\n');
      for (const line of lines) {
        const match = line.match(/(?:implementation|api|compile)\s+['"]([^'"]+)['"]/);
        if (match) {
          const parts = match[1].split(':');
          if (parts.length >= 2) {
            dependencies[parts[1]] = parts[2] || 'latest';
          }
        }
      }
      detectedLanguage = 'Java';
    } catch (e) {
      console.warn('Failed to parse build.gradle', e);
    }
  }

  // 3. Framework Detection
  let detectedFramework = 'None';
  if (dependencies['react'] || dependencies['react-dom']) detectedFramework = 'React';
  else if (dependencies['next']) detectedFramework = 'Next.js';
  else if (dependencies['vue']) detectedFramework = 'Vue';
  else if (dependencies['@angular/core']) detectedFramework = 'Angular';
  else if (dependencies['svelte']) detectedFramework = 'Svelte';
  else if (dependencies['express']) detectedFramework = 'Express';
  else if (dependencies['django'] || dependencies['Django']) detectedFramework = 'Django';
  else if (dependencies['flask'] || dependencies['Flask']) detectedFramework = 'Flask';
  else if (dependencies['fastapi'] || dependencies['FastAPI']) detectedFramework = 'FastAPI';
  else if (dependencies['actix-web']) detectedFramework = 'Actix Web';
  else if (dependencies['gin-gonic/gin'] || dependencies['gin']) detectedFramework = 'Gin';
  else if (Object.keys(dependencies).some(k => k.includes('spring-boot'))) detectedFramework = 'Spring Boot';

  // 4. API Framework Detection
  let apiFramework = 'None';
  if (dependencies['express']) apiFramework = 'Express';
  else if (dependencies['fastapi'] || dependencies['FastAPI']) apiFramework = 'FastAPI';
  else if (dependencies['flask'] || dependencies['Flask']) apiFramework = 'Flask';
  else if (dependencies['django'] || dependencies['Django']) apiFramework = 'Django (REST)';
  else if (dependencies['@nestjs/core']) apiFramework = 'NestJS';
  else if (dependencies['gin-gonic/gin']) apiFramework = 'Gin';
  else if (dependencies['actix-web']) apiFramework = 'Actix Web';
  else if (dependencies['apollo-server'] || dependencies['graphql']) apiFramework = 'GraphQL (Apollo)';
  else if (Object.keys(dependencies).some(k => k.includes('spring-boot-starter-web'))) apiFramework = 'Spring Boot';

  // 5. Database Detection
  let detectedDatabase = 'None';
  
  // Look at dependencies first
  if (dependencies['pg'] || dependencies['pg-promise'] || dependencies['sequelize'] && Object.keys(dependencies).some(k => k.includes('pg'))) {
    detectedDatabase = 'PostgreSQL';
  } else if (dependencies['mongoose'] || dependencies['mongodb']) {
    detectedDatabase = 'MongoDB';
  } else if (dependencies['mysql2'] || dependencies['mysql']) {
    detectedDatabase = 'MySQL';
  } else if (dependencies['sqlite3'] || dependencies['sqlite']) {
    detectedDatabase = 'SQLite';
  } else if (dependencies['redis'] || dependencies['ioredis']) {
    detectedDatabase = 'Redis';
  } else if (dependencies['prisma']) {
    detectedDatabase = 'Prisma Client';
  } else if (dependencies['psycopg2'] || dependencies['sqlalchemy'] && contentHasText(projectPath, 'postgresql://')) {
    detectedDatabase = 'PostgreSQL';
  }

  // If not found in dependencies, scan files like .env or configuration files for connection patterns
  if (detectedDatabase === 'None') {
    const envPath = path.join(projectPath, '.env');
    const envExamplePath = path.join(projectPath, '.env.example');
    let envContent = '';
    if (fs.existsSync(envPath)) envContent = fs.readFileSync(envPath, 'utf8');
    else if (fs.existsSync(envExamplePath)) envContent = fs.readFileSync(envExamplePath, 'utf8');

    if (envContent) {
      if (envContent.includes('postgresql://') || envContent.includes('postgres://')) detectedDatabase = 'PostgreSQL';
      else if (envContent.includes('mongodb+srv://') || envContent.includes('mongodb://')) detectedDatabase = 'MongoDB';
      else if (envContent.includes('mysql://')) detectedDatabase = 'MySQL';
      else if (envContent.includes('sqlite:')) detectedDatabase = 'SQLite';
      else if (envContent.includes('redis://')) detectedDatabase = 'Redis';
    }
  }

  // If it's Prisma, we can inspect prisma schema to find datasource provider
  if (detectedDatabase === 'Prisma Client' || detectedDatabase === 'None') {
    const prismaDir = path.join(projectPath, 'prisma');
    if (fs.existsSync(prismaDir)) {
      const files = fs.readdirSync(prismaDir);
      const schemaFile = files.find(f => f.endsWith('.prisma'));
      if (schemaFile) {
        try {
          const schemaContent = fs.readFileSync(path.join(prismaDir, schemaFile), 'utf8');
          const providerMatch = schemaContent.match(/provider\s*=\s*"([^"]+)"/);
          if (providerMatch) {
            detectedDatabase = `Prisma (${providerMatch[1]})`;
          }
        } catch (e) {}
      }
    }
  }

  // 6. Summary generation
  const summaryParts: string[] = [];
  summaryParts.push(`This is a ${detectedLanguage} project`);
  if (detectedFramework && detectedFramework !== 'None') {
    summaryParts.push(`built on the ${detectedFramework} framework`);
  }
  if (apiFramework && apiFramework !== 'None') {
    summaryParts.push(`using ${apiFramework} for its API layer`);
  }
  if (detectedDatabase && detectedDatabase !== 'None') {
    summaryParts.push(`integrating a ${detectedDatabase} database`);
  }
  summaryParts.push(`It consists of ${fileCount} files totaling ${formatSize(totalSize)}.`);

  const depKeys = Object.keys(dependencies);
  if (depKeys.length > 0) {
    const listedDeps = depKeys.slice(0, 4);
    summaryParts.push(`The project lists ${depKeys.length} package dependencies, including: ${listedDeps.join(', ')}.`);
  }

  const summary = summaryParts.join(' ');

  return {
    fileCount,
    totalSize,
    detectedLanguage,
    detectedFramework,
    dependencies,
    detectedDatabase,
    apiFramework,
    summary,
    fileStructure,
  };
}

// Check if a file in the directory contains specific text (simple helper)
function contentHasText(dir: string, text: string): boolean {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isFile() && ['.py', '.js', '.ts', '.env', '.json', '.xml', '.gradle'].includes(path.extname(file))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(text)) return true;
      }
    }
  } catch (e) {}
  return false;
}
