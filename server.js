const axios = require('axios');
const express = require('express');
require('dotenv').config();

const app = express();
const API_KEY = process.env.apiKey;

app.get('/api/odds', async (req, res) => {
    try {
        const sport = req.query.sport || 'upcoming'; // Default: upcoming events
        const region = req.query.region || 'us'; // Default: US
        let markets = req.query.markets || 'h2h'; // Default: Moneyline
        const oddsFormat = req.query.oddsFormat || "american"; // Default: American odds
        const dateFormat = req.query.dateFormat || "iso"; // Default: ISO date format
        const eventId = req.query.eventId; // Event ID (optional)

        // Check if no parameters are provided
        const hasNoParameters = Object.keys(req.query).length === 0;

        if (hasNoParameters) {
            // Fetch the list of available sports
            const sportsUrl = `https://api.the-odds-api.com/v4/sports?apiKey=${API_KEY}`;
            console.log(`Request sent: ${sportsUrl}`);

            const response = await axios.get(sportsUrl);

            // Show token usage in console
            console.log("Tokens Left:", response.headers['x-requests-remaining']);
            console.log("Tokens Used Total:", response.headers['x-requests-used']);
            console.log("Tokens Just Used:", response.headers['x-requests-last']);

            // Send the list of sports to the client
            return res.json(response.data);
        }

        // Set default bookmakers based on region
        let bookmakers;
        if (region === 'us') {
            bookmakers = req.query.bookmakers || 'betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag';
        } else if (region === 'us2') {
            bookmakers = req.query.bookmakers || 'ballybet,betanysports,betparx,espnbet,fliff,hardrockbet,windcreek';
        } else if (region === 'us_dfs') {
            bookmakers = req.query.bookmakers || 'prizepicks,underdog';
            markets = req.query.markets || 'player_points'; // Override markets for DFS
        } else {
            bookmakers = req.query.bookmakers; // Use provided bookmakers for other regions
        }

        // Build the API URL
        let apiUrl;

        if (eventId) {
            // Fetch odds for a specific event
            if (!sport || sport === 'upcoming') {
                throw new Error("Sport parameter is required when fetching odds for a specific event.");
            }
            apiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/events/${eventId}/odds?apiKey=${API_KEY}&regions=${region}&markets=${markets}&oddsFormat=${oddsFormat}&dateFormat=${dateFormat}`;
        } else if (sport === 'upcoming') {
            // Fetch upcoming events across all sports
            apiUrl = `https://api.the-odds-api.com/v4/sports/odds/?apiKey=${API_KEY}&regions=${region}&markets=${markets}&oddsFormat=${oddsFormat}&dateFormat=${dateFormat}`;
        } else {
            // Fetch odds for a specific sport
            apiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=${region}&markets=${markets}&oddsFormat=${oddsFormat}&dateFormat=${dateFormat}`;
        }

        // Add bookmakers to the URL if provided
        if (bookmakers) {
            apiUrl += `&bookmakers=${bookmakers}`;
        }

        console.log(`Request sent: ${apiUrl}`);

        // Make the request
        const response = await axios.get(apiUrl);

        // Show token usage in console
        console.log("Tokens Left:", response.headers['x-requests-remaining']);
        console.log("Tokens Used Total:", response.headers['x-requests-used']);
        console.log("Tokens Just Used:", response.headers['x-requests-last']);

        // Transform the data based on region
        let transformedData;
        if (region === 'us' || region === 'us2') {
            transformedData = transformOddsData(response.data);
        } else if (region === 'us_dfs') {
            transformedData = transformPlayerOddsData(response.data); // FIX ME: Implement this function
        } else {
            transformedData = response.data; // Return raw data for other regions
        }

        // Send the transformed data to the client
        res.json(transformedData);
    } catch (error) {
        console.error("API request failed:", error);
        res.status(500).json({ error: error.message || "Failed to fetch odds" });
    }
});

// Transform odds data for traditional sportsbooks
function transformOddsData(oddsData) {
    return oddsData.map(event => {
        const game = {
            id: event.id,
            sport: event.sport_title,
            commence_time: event.commence_time,
            home_team: event.home_team,
            away_team: event.away_team,
            bookmakers: event.bookmakers.map(bookmaker => ({
                key: bookmaker.key,
                title: bookmaker.title,
                markets: bookmaker.markets.map(market => ({
                    key: market.key,
                    outcomes: market.outcomes.map(outcome => ({
                        name: outcome.name,
                        price: outcome.price
                    }))
                }))
            }))
        };
        return game;
    });
}

function transformPlayerOddsData(oddsData) {
    const playerOdds = {};

    // Iterate through each bookmaker
    oddsData.bookmakers.forEach(bookmaker => {
        // Iterate through each market (e.g., player_points)
        bookmaker.markets.forEach(market => {
            // Iterate through each outcome (e.g., Over/Under for a player)
            market.outcomes.forEach(outcome => {
                const playerName = outcome.description; // Player name
                const bookmakerKey = bookmaker.key; // Bookmaker key (e.g., "underdog")
                const bookmakerTitle = bookmaker.title; // Bookmaker title (e.g., "Underdog")
                const outcomeType = outcome.name; // "Over" or "Under"

                // Initialize player entry if it doesn't exist
                if (!playerOdds[playerName]) {
                    playerOdds[playerName] = {};
                }

                // Initialize over/under entry for the player if it doesn't exist
                if (!playerOdds[playerName][outcomeType]) {
                    playerOdds[playerName][outcomeType] = {
                        point: outcome.point, // Point threshold (e.g., 27.5)
                        books: {}
                    };
                }

                // Add the bookmaker odds to the over/under entry
                playerOdds[playerName][outcomeType].books[bookmakerKey] = {
                    title: bookmakerTitle,
                    price: outcome.price // Odds (e.g., -137)
                };
            });
        });
    });

    return playerOdds;
}

function calculateImpliedOdds(oddsData) {
// FIX ME
}

// Transform odds data for DFS player props
function getOddsByPlayerProp(oddsData) {
    // TODO: Implement this function to handle DFS player props
    return oddsData;
}

app.listen(3000, () => console.log("Server running on port 3000"));