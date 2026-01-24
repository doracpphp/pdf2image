# PDF to PNG Converter

A web application that converts PDF files to PNG images directly in your browser.

## Demo

https://pdf2image.frees.jp

## Features

- **Complete Privacy**: All processing happens in your browser - no data is ever sent to a server
- **Offline Support**: Works without an internet connection
- **Japanese PDF Support**: Correctly renders PDFs containing Japanese fonts
- **High Resolution Output**: Renders at 2x scale for crisp, clear images
- **Bulk Download**: Download all pages as a ZIP file

## Tech Stack

- React 19
- TypeScript
- Vite
- pdfjs-dist (PDF.js)
- JSZip

## Setup

```bash
# Install dependencies
npm install
```

## Development

```bash
# Start development server
npm run dev
```

## Build

```bash
# Production build
npm run build
```

Build output is generated in the `dist` directory.

## Deploy (Cloudflare Pages)

```bash
npx wrangler pages deploy dist --project-name pdf2image
```

## Usage

1. Drag and drop a PDF file, or click to select one
2. Once conversion is complete, thumbnails for each page are displayed
3. Click a thumbnail to view it in full size
4. Click "Download" to save individual PNG images
5. Click "Download as ZIP" to save all pages at once

## License

MIT
