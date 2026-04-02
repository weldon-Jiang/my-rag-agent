const axios = require('axios');

async function execute(args, context = {}) {
  const { category = 'random', description = '' } = args;

  console.log(`[wallpaper tool] Fetching wallpaper: ${category}`);

  try {
    const response = await axios.get('https://nekos.best/api/v2/wallpaper', {
      timeout: 10000
    });

    if (!response.data || !response.data.results || response.data.results.length === 0) {
      return { success: false, error: 'No wallpaper found' };
    }

    const wallpaperData = response.data.results[0];

    return {
      success: true,
      imageUrl: wallpaperData.url,
      artist: wallpaperData.artist_name || 'Unknown',
      source: wallpaperData.source_url || ''
    };
  } catch (error) {
    console.error(`[wallpaper tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };