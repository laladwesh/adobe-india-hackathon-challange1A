# PDF Structure Extraction - Adobe India Hackathon: Round 1A

## Introduction

This project is a Node.js/Docker solution developed for Round 1A of the Adobe India "Connecting the Dots" hackathon. The application processes PDF files from an input directory and generates structured JSON outlines containing hierarchical headings (Title, H1, H2, H3) for each document, outputting the results to a designated output directory. The solution operates entirely offline without external API calls or pre-trained machine learning models.

## Approach

Our solution employs a sophisticated, multi-step heuristic algorithm to accurately extract document structure from PDF files. The approach combines text extraction, style analysis, and intelligent pattern recognition to identify titles and hierarchical headings.

### Step 1: Line-by-Line Text Extraction

The script utilizes **pdf.js** to parse every page of the PDF document, systematically grouping text fragments into complete lines based on their y-coordinates. This process preserves critical style information including font size, weight, and formatting properties. By analyzing the spatial positioning of text elements, we ensure that multi-line content is properly reconstructed while maintaining the original document's visual hierarchy.

### Step 2: Intelligent Title Detection

Title identification goes beyond simply finding the largest font size. Our algorithm identifies the most prominent text block on the first page by analyzing multiple factors including font size, positioning, and styling. The system correctly handles multi-line titles by examining subsequent lines that are spatially close and stylistically similar to the initial title candidate, ensuring accurate grouping of title components that may span multiple lines.

### Step 3: Primary Heading Detection (Numbered Lists)

The most reliable method for heading detection employs a sophisticated regular expression pattern (`/^((\d+(\.\d+)*)\s+)/`) that identifies numbered headings such as "1.", "1.1", "2.1.3", and similar hierarchical numbering schemes. The algorithm maps the numerical depth directly to heading levels (H1, H2, H3), providing consistent and accurate structural extraction for documents that follow standard numbering conventions.

### Step 4: Fallback Heading Detection (Style Analysis)

For PDFs that don't utilize numbered headings, the system implements a comprehensive fallback mechanism based on style analysis. The algorithm analyzes font style frequencies across the document, identifies the most common style as body text, and treats rarer, larger, and bolder styles as potential headings. This statistical approach ensures robust heading detection even in documents with inconsistent formatting patterns.

### Step 5: Poster & Flyer Handling

The final step includes specialized handling for single-page documents such as posters and flyers. The system performs a document type check, extracts the main heading as the title for such documents, and appropriately produces an empty structural outline when traditional hierarchical content is not present.

## Libraries & Models

### Primary Libraries
- **pdfjs-dist**: Core PDF parsing and text extraction functionality

### Model Usage
No pre-trained machine learning models were used in this solution to meet the hackathon's constraint requirements. The entire approach relies on heuristic algorithms and pattern recognition techniques.

## How to Build and Run

### Prerequisites
- **Docker Desktop** must be installed on your system

### Build and Execution Instructions

1. **Navigate to the project directory** containing the Dockerfile

2. **Build the Docker image** using the following command:
   ```bash
   docker build --platform linux/amd64 -t mysolution:latest .
   ```

3. **Prepare your input directory** with PDF files to be processed

4. **Run the application** using the appropriate command for your operating system:

   **For Windows (cmd.exe):**
   ```cmd
   docker run --rm -v "%cd%\input:/app/input" -v "%cd%\output:/app/output" --network none mysolution:latest
   ```

   **For PowerShell, Linux, or macOS:**
   ```bash
   docker run --rm -v "$(pwd)/input:/app/input" -v "$(pwd)/output:/app/output" --network none mysolution:latest
   ```

The `--network none` flag ensures the container runs in complete isolation without internet access, meeting the offline requirement. The volume mounts connect your local input and output directories to the container's processing directories.

### Input/Output

- **Input**: Place PDF files in the `input/` directory
- **Output**: Structured JSON files with hierarchical outlines will be generated in the `output/` directory

Each output JSON file contains the extracted document structure with Title, H1, H2, and H3 headings organized in a hierarchical format.