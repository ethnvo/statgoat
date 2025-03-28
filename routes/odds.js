const express = require('express');
const router = express.Router();
const axios = require('axios');
const {
  transformOddsData,
  findOddsDiscrepancies,
  transformPlayerOddsData,
} = require('../utils/oddsUtils');

const API_KEY = process.env.apiKey;

// GET /api/odds
router.get('/', async (req, res, next) => {
  try {
    const {
      sport = 'upcoming',
      region = 'us',
      markets = 'h2h',
      oddsFormat = 'american',
      dateFormat = 'iso',
      eventId,
      bookmakers: rawBookmakers,
    } = req.query;

    // Handle "no parameters" case (list all sports)
    if (Object.keys(req.query).length === 0) {
      const sportsUrl = `https://api.the-odds-api.com/v4/sports?apiKey=${API_KEY}`;
      const response = await axios.get(sportsUrl);
      logTokenUsage(response);
      return res.json(response.data);
    }

    // Set bookmakers based on region
    const bookmakers = getBookmakersByRegion(region, rawBookmakers);

    // Build API URL
    const apiUrl = buildOddsApiUrl({
      sport,
      region,
      markets,
      oddsFormat,
      dateFormat,
      eventId,
      bookmakers,
      apiKey: API_KEY,
    });

    console.log(`Request sent: ${apiUrl}`);

    // Fetch data
    const response = await axios.get(apiUrl);
    logTokenUsage(response);

    // Transform data
    let transformedData;
    if (region === 'us' || region === 'us2') {
      transformedData = transformOddsData(response.data);
    } else if (region === 'us_dfs') {
      transformedData = transformPlayerOddsData(response.data);
    } else {
      transformedData = response.data;
    }

    res.json(transformedData);
  } catch (err) {
    next(err);
  }
});

// Helper: Log API token usage
function logTokenUsage(response) {
  console.log('Tokens Left:', response.headers['x-requests-remaining']);
  console.log('Tokens Used:', response.headers['x-requests-used']);
}

// Helper: Set default bookmakers by region
function getBookmakersByRegion(region, customBookmakers) {
  if (customBookmakers) return customBookmakers;

  switch (region) {
    case 'us':
      return 'betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag';
    case 'us2':
      return 'ballybet,betanysports,betparx,espnbet,fliff,hardrockbet,windcreek';
    case 'us_dfs':
      return 'prizepicks,underdog';
    default:
      return '';
  }
}

// Helper: Build the Odds API URL
function buildOddsApiUrl({
  sport,
  region,
  markets,
  oddsFormat,
  dateFormat,
  eventId,
  bookmakers,
  apiKey,
}) {
  let url;
  if (eventId) {
    if (!sport || sport === 'upcoming') {
      throw new Error('Sport parameter required for event-specific odds.');
    }
    url = `https://api.the-odds-api.com/v4/sports/${sport}/events/${eventId}/odds`;
  } else if (sport === 'upcoming') {
    url = 'https://api.the-odds-api.com/v4/sports/odds';
  } else {
    url = `https://api.the-odds-api.com/v4/sports/${sport}/odds`;
  }

  url += `?apiKey=${apiKey}&regions=${region}&markets=${markets}&oddsFormat=${oddsFormat}&dateFormat=${dateFormat}`;

  if (bookmakers) url += `&bookmakers=${bookmakers}`;
  return url;
}

module.exports = router;