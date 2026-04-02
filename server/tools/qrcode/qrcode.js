const axios = require('axios');

async function execute(args, context = {}) {
  const { data = '', size = '300x300', description = '' } = args;

  console.log(`[qrcode tool] Generating QR code`);

  try {
    if (!data) {
      return { success: false, error: 'Data parameter is required' };
    }

    const sizeParts = size.split('x');
    const width = parseInt(sizeParts[0]) || 300;
    const height = parseInt(sizeParts[1]) || 300;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${width}x${height}`;

    return {
      success: true,
      qrUrl: qrUrl,
      data: data,
      size: `${width}x${height}`,
      downloadUrl: qrUrl
    };
  } catch (error) {
    console.error(`[qrcode tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
