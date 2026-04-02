const axios = require('axios');

async function execute(args, context = {}) {
  const { tags = '', description = '' } = args;

  console.log(`[quotes tool] Fetching random quote`);

  try {
    const params = {};
    if (tags) {
      params.tags = tags;
    }

    const response = await axios.get('https://api.quotable.io/random', {
      params,
      timeout: 10000
    });

    const { content, author, tags: quoteTags, dateAdded, _id } = response.data;

    return {
      success: true,
      quote: {
        id: _id,
        content: content,
        author: author,
        tags: quoteTags,
        dateAdded: dateAdded
      }
    };
  } catch (error) {
    console.error(`[quotes tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
