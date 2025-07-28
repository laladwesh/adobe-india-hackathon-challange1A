const fs = require('fs').promises;
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

const INPUT_DIR = '/app/input';
const OUTPUT_DIR = '/app/output';

function normalizeLine(items = []) {
  if (!items.length) return null;
  const text = items
    .map(i => i.str)
    .join(' ')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim();
  if (!text) return null;
  const { transform, fontName = '' } = items[0];
  const size = parseFloat(transform[3].toFixed(2));
  const weight = /bold/i.test(fontName) ? 'bold' : 'normal';
  return { text, size, weight };
}

async function extractOutline(pdf) {
  const yThreshold = 5;
  const rawLines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const { items } = await page.getTextContent();
    if (!items.length) continue;

    items.sort((a, b) => {
      const dy = b.transform[5] - a.transform[5];
      if (Math.abs(dy) > yThreshold) return dy;
      return a.transform[4] - b.transform[4];
    });

    let lineGroup = [items[0]];
    for (let i = 1; i < items.length; i++) {
      const prevY = lineGroup[lineGroup.length - 1].transform[5];
      const currY = items[i].transform[5];
      if (Math.abs(prevY - currY) <= yThreshold) {
        lineGroup.push(items[i]);
      } else {
        const line = normalizeLine(lineGroup);
        if (line) rawLines.push({ ...line, page: pageNum });
        lineGroup = [items[i]];
      }
    }
    const lastLine = normalizeLine(lineGroup);
    if (lastLine) rawLines.push({ ...lastLine, page: pageNum });
  }

  const lines = rawLines.filter(l => l.text.toLowerCase() !== `page ${l.page}`);
  if (!lines.length) return { title: 'Untitled Document', outline: [] };

  const page1 = lines.filter(l => l.page === 1);
  const maxFont = Math.max(...page1.map(l => l.size));
  const title =
    page1.filter(l => l.size === maxFont).map(l => l.text).join(' ') ||
    'Untitled Document';

  const sizes = Array.from(new Set(lines.map(l => l.size)))
    .sort((a, b) => b - a)
    .filter(s => s !== maxFont);

  const sizeToTag = {};
  if (sizes[0]) sizeToTag[sizes[0]] = 'H1';
  if (sizes[1]) sizeToTag[sizes[1]] = 'H2';
  if (sizes[2]) sizeToTag[sizes[2]] = 'H3';

  const outline = lines
    .filter(l => sizeToTag[l.size] && !title.includes(l.text))
    .map(l => ({ level: sizeToTag[l.size], text: l.text, page: l.page }));

  return { title, outline };
}

async function main() {
  console.log('Starting extraction...');
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const allFiles = await fs.readdir(INPUT_DIR);
  const pdfFiles = allFiles.filter(f => f.toLowerCase().endsWith('.pdf'));

  if (!pdfFiles.length) {
    console.log('No PDFs found in input.');
    return;
  }

  for (const file of pdfFiles) {
    console.log(`→ ${file}`);
    const inPath = path.join(INPUT_DIR, file);
    const outName = path.basename(file, '.pdf') + '.json';
    const outPath = path.join(OUTPUT_DIR, outName);

    try {
      const data = await fs.readFile(inPath);
      const uint8 = new Uint8Array(data);
      const pdf = await pdfjs.getDocument(uint8).promise;
      const result = await extractOutline(pdf);
      await fs.writeFile(outPath, JSON.stringify(result, null, 2));
      console.log(`   ✔ ${outName}`);
    } catch (err) {
      console.error(`   ✖ failed: ${err.message}`);
      await fs.writeFile(
        outPath,
        JSON.stringify({ title: `Error: ${file}`, outline: [] }, null, 2)
      );
    }
  }

  console.log('Done.');
}

main().catch(err => console.error(err));
