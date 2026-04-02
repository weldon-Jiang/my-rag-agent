const axios = require('axios');

async function execute(args, context = {}) {
  const { count = 1, description = '' } = args;

  console.log(`[random-user tool] Fetching random user data`);

  try {
    const response = await axios.get('https://randomuser.me/api/', {
      params: { results: count },
      timeout: 10000
    });

    const users = response.data.results.map(user => ({
      name: `${user.name.first} ${user.name.last}`,
      gender: user.gender,
      email: user.email,
      phone: user.phone,
      cell: user.cell,
      location: {
        street: `${user.location.street.number} ${user.location.street.name}`,
        city: user.location.city,
        state: user.location.state,
        country: user.location.country,
        postcode: user.location.postcode
      },
      picture: user.picture.large,
      username: user.login.username,
      dob: {
        date: user.dob.date,
        age: user.dob.age
      },
      registered: {
        date: user.registered.date,
        age: user.registered.age
      }
    }));

    return {
      success: true,
      data: count === 1 ? users[0] : users,
      total: users.length,
      info: response.data.info
    };
  } catch (error) {
    console.error(`[random-user tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
