const pdf = require('pdf-parse');
const path = require('path');
const fs = require('fs');

async function processPdf(filepath, filename) {
  try {
    const stats = fs.statSync(filepath);
    const pdfBuffer = fs.readFileSync(filepath);
    const PDFParse = pdf.PDFParse;
    const parser = new PDFParse({ data: pdfBuffer });
    const pdfData = await parser.getText();
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    const textContent = pdfData?.text || '';
    const cleanedText = textContent
      .replace(/\s+/g, ' ')
      .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, '')
      .trim();

    let summary = '';
    if (cleanedText.length > 0) {
      const firstPart = cleanedText.substring(0, 200);
      summary = firstPart + (cleanedText.length > 200 ? '...' : '');
    } else {
      summary = `PDF文档: ${filename} | 大小: ${fileSizeKB} KB`;
    }

    const result = {
      success: true,
      filename,
      fileSize: stats.size,
      pageCount: pdfData?.total || null,
      content: summary,
      textContent: cleanedText,
      metadata: {
        type: 'pdf',
        format: 'application/pdf',
        size: stats.size,
        sizeFormatted: `${fileSizeKB} KB`,
        pages: pdfData?.total || null,
      },
    };

    console.log(JSON.stringify(result));
    process.exit(0);
  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message,
      filename,
    };
    console.error(JSON.stringify(errorResult));
    process.exit(1);
  }
}

const filepath = process.argv[2];
const filename = process.argv[3];

if (filepath && filename) {
  processPdf(filepath, filename);
} else {
  console.error(JSON.stringify({ success: false, error: 'Missing arguments' }));
  process.exit(1);
}
