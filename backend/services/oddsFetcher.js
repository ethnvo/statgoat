const axios = require('axios');
const Odds = require('../models/Odds');
const { transformOddsData } = require('../utils/oddsUtils');

class OddsFetcher {
  constructor() {
    this.API_KEY = process.env.ODDS_API_KEY;
    this.updateInterval = 5 * 60 * 1000; // 5 minutes
  }

  async fetchAllSports() {
    try {
      const sports = await axios.get(
        `https://api.the-odds-api.com/v4/sports?apiKey=${this.API_KEY}`
      );
      return sports.data.filter(sport => sport.active);
    } catch (error) {
      console.error('Error fetching sports:', error);
      return [];
    }
  }

  async updateOddsForSport(sportKey) {
    try {
      const response = await axios.get(
        `https://api.the-odds-api.com/v4/sports/${sportKey}/odds`,
        {
          params: {
            apiKey: this.API_KEY,
            regions: 'us,us2',
            markets: 'h2h,spreads,totals',
            oddsFormat: 'american'
          }
        }
      );

      const transformed = transformOddsData(response.data);
      
      // Bulk upsert operation
      const bulkOps = transformed.map(event => ({
        updateOne: {
          filter: { eventId: event.eventId },
          update: { $set: event },
          upsert: true
        }
      }));

      await Odds.bulkWrite(bulkOps);
      console.log(`Updated ${transformed.length} events for ${sportKey}`);
    } catch (error) {
      console.error(`Error updating odds for ${sportKey}:`, error);
    }
  }

  async start() {
    console.log('Starting odds fetcher service...');
    await this.runUpdate();
    setInterval(() => this.runUpdate(), this.updateInterval);
  }

  async runUpdate() {
    const sports = await this.fetchAllSports();
    for (const sport of sports) {
      await this.updateOddsForSport(sport.key);
    }
  }
}

module.exports = new OddsFetcher();