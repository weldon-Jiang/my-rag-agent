const axios = require('axios');

async function execute(args, context = {}) {
  const { breed = '', description = '' } = args;

  console.log(`[dog-api tool] Fetching random dog image`);

  try {
    let url = 'https://dog.ceo/api/breeds/image/random';

    if (breed) {
      url = `https://dog.ceo/api/breed/${encodeURIComponent(breed)}/images/random`;
    }

    const response = await axios.get(url, { timeout: 10000 });

    if (response.data.status !== 'success') {
      return {
        success: false,
        error: response.data.message || 'Failed to fetch dog image'
      };
    }

    return {
      success: true,
      imageUrl: response.data.message,
      breed: breed || 'random',
      status: response.data.status
    };
  } catch (error) {
    console.error(`[dog-api tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
