#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function rmrf(p) {
  try {
    await fs.rm(p, { recursive: true, force: true });
  } catch (err) {}
}

async function copyFile(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function getVersionFromPackageJson(pkgPath) {
  try {
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
    return pkg.version || '0.0.0';
  } catch (err) {
    return '0.0.0';
  }
}

async function main() {
  const templateDir = path.join(process.cwd(), 'user-manual', 'templates');
  const tmpCaptureDir = path.join(process.cwd(), 'user-manual', 'tmp-captures');
  const outDir = path.join(process.cwd(), 'user-manual');
  const product = 'recruitiq';
  const manifestPath = path.join(templateDir, `${product}-manual.json`);
  const manifest = await readJson(manifestPath);

  const productTmpDir = path.join(tmpCaptureDir, product);
  const targetDir = path.join(outDir, product);
  const assetsDir = path.join(targetDir, 'assets', product);

  // Clean target (idempotent)
  await rmrf(targetDir);
  await fs.mkdir(assetsDir, { recursive: true });

  // Determine version if configured to read package.json
  if (manifest.versionSource) {
    const pkgPath = path.join(process.cwd(), manifest.versionSource);
    manifest.version = await getVersionFromPackageJson(pkgPath);
  }

  // Build markdown
  let md = `# ${manifest.title}\n\n`;
  md += `Version: ${manifest.version}\n\n`;
  md += `---\n\n## Table of contents\n\n`;
  for (const f of manifest.flows) {
    md += `- [${f.title}](#${f.id})\n`;
  }
  md += '\n';

  // Copy screenshots and write steps
  for (const f of manifest.flows) {
    md += `\n## ${f.title}\n\n`;
    let i = 1;
    for (const step of f.steps) {
      md += `${i}. ${step.text}\n\n`;
      if (step.screenshot) {
        const srcScreenshot = path.join(productTmpDir, step.screenshot);
        const targetScreenshot = path.join(assetsDir, step.screenshot);
        try {
          await copyFile(srcScreenshot, targetScreenshot);
          const relPath = path.posix.join('assets', product, step.screenshot);
          md += `![${step.text}](${relPath})\n\n`;
        } catch (err) {
          md += `> Screenshot not found: ${step.screenshot}\n\n`;
        }
      }
      i++;
    }
  }

  // Write manual.md
  await fs.mkdir(targetDir, { recursive: true });
  const outManual = path.join(targetDir, 'manual.md');
  await fs.writeFile(outManual, md, 'utf8');

  console.log('Manual generated at', outManual);
  console.log('Assets written to', assetsDir);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
