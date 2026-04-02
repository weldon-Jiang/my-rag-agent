const axios = require('axios');

async function execute(args, context = {}) {
  const { description = '' } = args;

  console.log(`[cat-image tool] Fetching random cat image`);

  try {
    const response = await axios.get('https://api.thecatapi.com/v1/images/search', {
      timeout: 10000
    });

    if (!response.data || response.data.length === 0) {
      return { success: false, error: 'No cat image found' };
    }

    const catData = response.data[0];

    return {
      success: true,
      imageUrl: catData.url,
      id: catData.id,
      width: catData.width,
      height: catData.height
    };
  } catch (error) {
    console.error(`[cat-image tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
