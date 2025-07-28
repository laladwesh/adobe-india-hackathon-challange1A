// This script is the final, submittable solution for the hackathon.
// It reads PDFs from an /input folder and writes JSON to an /output folder.

const fs = require('fs').promises;
const path = require('path');
// Use the Node.js distribution of pdf.js
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const INPUT_DIR = '/app/input';
const OUTPUT_DIR = '/app/output';

/**
 * Helper function to process a line of text fragments from the PDF.
 * It merges text, determines font size, and checks for bold weight.
 */
const processLine = (lineItems) => {
    if (!lineItems || lineItems.length === 0) return { text: null, size: null, weight: null };
    // Clean instructional text like "(Title...)" and join fragments.
    const text = lineItems.map(item => item.str).join(' ').trim().replace(/\s*\(.*?\)\s*/g, '').trim();
    if (!text) return { text: null, size: null, weight: null };

    const size = parseFloat(lineItems[0].transform[3].toFixed(2));
    const fontName = lineItems[0].fontName || '';
    // Check if the font name includes "bold" (case-insensitive).
    const weight = /bold/i.test(fontName) ? "bold" : "normal";
    return { text, size, weight };
};

/**
 * The core logic to extract the document outline.
 * This is the same logic from your final React component.
 */
async function extractOutline(pdf) {
    const yTolerance = 5; // How close in y-coordinate for text to be on the same line.
    const lines = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        if (textContent.items.length === 0) continue;

        // Sort items by their vertical then horizontal position.
        const sortedItems = textContent.items.sort((a, b) => {
            const y1 = a.transform[5];
            const y2 = b.transform[5];
            if (Math.abs(y1 - y2) > yTolerance) return y2 - y1;
            return a.transform[4] - b.transform[4];
        });

        if (sortedItems.length === 0) continue;

        // Group text items into lines.
        let currentLineItems = [sortedItems[0]];
        for (let j = 1; j < sortedItems.length; j++) {
            const prevItem = sortedItems[j - 1];
            const currentItem = sortedItems[j];
            if (Math.abs(prevItem.transform[5] - currentItem.transform[5]) <= yTolerance) {
                currentLineItems.push(currentItem);
            } else {
                const { text, size, weight } = processLine(currentLineItems);
                if (text) lines.push({ text, size, weight, page: i });
                currentLineItems = [currentItem];
            }
        }
        const { text, size, weight } = processLine(currentLineItems);
        if (text) lines.push({ text, size, weight, page: i });
    }
    
    // Filter out any remaining empty or page number lines.
    const cleanedLines = lines.filter(line => line.text && line.text.toLowerCase() !== `page ${line.page}`);
    if (cleanedLines.length === 0) {
        return { title: "Untitled Document", outline: [] };
    }

    // --- START OF TITLE FIX ---

    // Step 1: Intelligently identify the title from the first page.
    let title = "Untitled Document";
    const firstPageLines = cleanedLines.filter(l => l.page === 1);
    let titleSize = 0;

    if (firstPageLines.length > 0) {
        // Find the largest font size that appears on the first page.
        titleSize = Math.max(...firstPageLines.map(l => l.size));
        
        // Collect all lines on the first page that have this size and join them.
        const titleLines = firstPageLines
            .filter(l => l.size === titleSize)
            .map(l => l.text);
            
        if (titleLines.length > 0) {
            title = titleLines.join(' ');
        }
    }

    // Step 2: Determine heading levels, excluding the title's font size.
    const uniqueSizes = [...new Set(cleanedLines.map(l => l.size))].sort((a, b) => b - a);
    const sizeToLevel = {};
    
    // Filter out the title's font size before assigning H1, H2, H3.
    const remainingSizes = uniqueSizes.filter(s => s !== titleSize);
    
    if (remainingSizes.length > 0) sizeToLevel[remainingSizes[0]] = "H1";
    if (remainingSizes.length > 1) sizeToLevel[remainingSizes[1]] = "H2";
    if (remainingSizes.length > 2) sizeToLevel[remainingSizes[2]] = "H3";

    // Step 3: Build the final outline, ensuring title text is not included.
    const finalOutline = [];
    for (const line of cleanedLines) {
        const level = sizeToLevel[line.size];
        // Add to outline only if it's a heading and its text isn't part of the title.
        if (level && !title.includes(line.text)) {
            finalOutline.push({ level, text: line.text, page: line.page });
        }
    }
    
    return { title, outline: finalOutline };
    // --- END OF TITLE FIX ---
}

/**
 * Main function to run the extraction process.
 */
async function main() {
    console.log('Starting PDF structure extraction...');
    try {
        // Ensure the output directory exists.
        await fs.mkdir(OUTPUT_DIR, { recursive: true });

        const files = await fs.readdir(INPUT_DIR);
        const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');

        if (pdfFiles.length === 0) {
            console.log('No PDF files found in the input directory.');
            return;
        }

        for (const pdfFile of pdfFiles) {
            const inputPath = path.join(INPUT_DIR, pdfFile);
            const outputFileName = `${path.parse(pdfFile).name}.json`;
            const outputPath = path.join(OUTPUT_DIR, outputFileName);
            
            console.log(`Processing ${pdfFile}...`);

            try {
                const data = await fs.readFile(inputPath);
                const typedarray = new Uint8Array(data);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                const result = await extractOutline(pdf);
                
                // Write the JSON output to the output directory.
                await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
                console.log(`Successfully created ${outputFileName}`);
            } catch (err) {
                console.error(`Failed to process ${pdfFile}:`, err.message);
                // Create a fallback JSON on error.
                const errorResult = { title: `Error processing ${pdfFile}`, outline: [] };
                await fs.writeFile(outputPath, JSON.stringify(errorResult, null, 2));
            }
        }
    } catch (error) {
        console.error('An error occurred in the main process:', error);
    }
    console.log('Extraction process finished.');
}

// Run the main function.
main();
