const express = require('express');
const router = express.Router();
const axios = require('axios');
const Odds = require('../models/Odds');

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
      analyze = 'true' // New parameter to toggle discrepancy analysis
    } = req.query;

    // Handle "no parameters" case (list all sports)
    if (Object.keys(req.query).length === 0) {
      const sports = await Odds.distinct('sport');
      return res.json(sports);
    }

    // Set bookmakers based on region
    const bookmakers = getBookmakersByRegion(region, rawBookmakers);

    // First try to get data from database
    let dbQuery = {};
    if (sport && sport !== 'upcoming') dbQuery.sportKey = sport;
    if (eventId) dbQuery.eventId = eventId;

    let oddsData = await Odds.find(dbQuery).lean();

    // If no data in DB or data is stale (older than 5 minutes), fetch from API
    if (oddsData.length === 0 || isDataStale(oddsData[0].lastFetched)) {
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
      const response = await axios.get(apiUrl);
      logTokenUsage(response);

      // Transform and store the data
      let transformedData;
      if (region === 'us' || region === 'us2') {
        transformedData = transformOddsData(response.data);
      } else if (region === 'us_dfs') {
        transformedData = transformPlayerOddsData(response.data);
      } else {
        transformedData = response.data;
      }

      // Store in database
      if (Array.isArray(transformedData)) {
        for (const event of transformedData) {
          await Odds.findOneAndUpdate(
            { eventId: event.eventId },
            event,
            { upsert: true, new: true }
          );
        }
        oddsData = transformedData;
      } else {
        await Odds.findOneAndUpdate(
          { eventId: transformedData.eventId },
          transformedData,
          { upsert: true, new: true }
        );
        oddsData = [transformedData];
      }
    }

    // Apply additional filtering
    if (bookmakers) {
      const bookmakerList = bookmakers.split(',');
      oddsData = oddsData.map(event => ({
        ...event,
        bookmakers: event.bookmakers.filter(bm => bookmakerList.includes(bm.key))
      }));
    }

    // Add discrepancy analysis if enabled and applicable
    if (analyze === 'true' && (region === 'us' || region === 'us2')) {
      oddsData = oddsData.map(event => {
        const discrepancies = findOddsDiscrepancies([event]);
        return {
          ...event,
          analysis: {
            discrepancies: discrepancies.length > 0 ? discrepancies[0].discrepancies : [],
            timestamp: new Date().toISOString()
          }
        };
      });
    }

    res.json(oddsData);
  } catch (err) {
    next(err);
  }
});

// Helper to check if data is stale (older than 5 minutes)
function isDataStale(lastFetched) {
  return (Date.now() - new Date(lastFetched).getTime()) > 5 * 60 * 1000;
}

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