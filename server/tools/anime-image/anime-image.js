const axios = require('axios');

async function execute(args, context = {}) {
  const { category = 'hug', description = '' } = args;

  console.log(`[anime-image tool] Fetching anime ${category} image`);

  try {
    const endpoints = {
      hug: 'https://api.nekos.best/api/v2/hug',
      kiss: 'api.nekos.best/api/v2/kiss',
      pat: 'api.nekos.best/api/v2/pat',
      waifu: 'api.nekos.best/api/v2/waifu',
      neko: 'api.nekos.best/api/v2/neko'
    };

    const endpoint = endpoints[category] || endpoints.waifu;
    const response = await axios.get(`https://${endpoint}`, {
      timeout: 10000
    });

    if (!response.data || !response.data.results || response.data.results.length === 0) {
      return { success: false, error: 'No anime image found' };
    }

    const animeData = response.data.results[0];

    return {
      success: true,
      imageUrl: animeData.url,
      artist: animeData.artist_name || 'Unknown',
      source: animeData.source_url || ''
    };
  } catch (error) {
    console.error(`[anime-image tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };