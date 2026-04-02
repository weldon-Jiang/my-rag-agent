const axios = require('axios');

async function execute(args, context = {}) {
  const { width = 400, height = 300, description = '' } = args;

  console.log(`[random-image tool] Fetching random image`);

  try {
    const imageUrl = `https://picsum.photos/${width}/${height}`;

    const response = await axios.head(imageUrl, { timeout: 10000 });

    return {
      success: true,
      url: imageUrl,
      width: width,
      height: height,
      imageUrl: response.request.res.responseUrl || imageUrl,
      photographer: 'Random from Picsum'
    };
  } catch (error) {
    console.error(`[random-image tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
