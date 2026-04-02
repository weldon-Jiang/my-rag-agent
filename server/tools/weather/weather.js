const axios = require('axios');

async function execute(args, context = {}) {
  const { city = '', description = '' } = args;

  console.log(`[weather tool] Fetching weather data for: ${city || 'default'}`);

  try {
    let query = city;
    let latitude, longitude;

    if (city) {
      const geoResponse = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: { name: city, count: 1 },
        timeout: 10000
      });

      if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
        return { success: false, error: `City not found: ${city}` };
      }

      const location = geoResponse.data.results[0];
      latitude = location.latitude;
      longitude = location.longitude;
      query = `${location.name}, ${location.country}`;
    } else {
      latitude = 39.9042;
      longitude = 116.4074;
      query = 'Beijing';
    }

    const weatherResponse = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude,
        longitude,
        current_weather: true,
        hourly: 'temperature_2m,relativehumidity_2m,weathercode',
        timezone: 'auto',
        forecast_days: 1
      },
      timeout: 10000
    });

    const data = weatherResponse.data;
    const current = data.current_weather;

    const weatherCodeMap = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };

    return {
      success: true,
      location: query,
      current: {
        temperature: current.temperature,
        windspeed: current.windspeed,
        winddirection: current.winddirection,
        weathercode: current.weathercode,
        weather: weatherCodeMap[current.weathercode] || 'Unknown',
        isDay: current.is_day === 1,
        time: current.time
      },
      hourly: data.hourly ? {
        temperature: data.hourly.temperature_2m[0],
        humidity: data.hourly.relativehumidity_2m[0],
        weatherCode: data.hourly.weathercode[0]
      } : null,
      timezone: data.timezone
    };
  } catch (error) {
    console.error(`[weather tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
