const axios = require('axios');

async function execute(args, context = {}) {
  const { description = '' } = args;

  console.log(`[cat-facts tool] Fetching random cat fact`);

  try {
    const response = await axios.get('https://catfact.ninja/fact', {
      timeout: 10000
    });

    return {
      success: true,
      fact: response.data.fact,
      length: response.data.length
    };
  } catch (error) {
    console.error(`[cat-facts tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
