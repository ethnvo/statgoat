const axios = require('axios');
const express = require('express');
require('dotenv').config();

const app = express();
const API_KEY = process.env.apiKey;

//console.log(API_KEY);

app.get('/api/odds', async (req, res) => {
    try {
        const sport = req.query.sport || 'basketball_nba'; // Default: NBA
        const region = req.query.region || 'us'; // Default: US
        const markets = req.query.markets || 'h2h'; // Default: Moneyline
        const bookmakers = req.query.bookmakers || 'betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag'; // Defaults to these books
        const oddsFormat = "american";
        
        let apiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=${region}&markets=${markets}&oddsFormat=${oddsFormat}`;
        
        if (bookmakers) {
            apiUrl += `&bookmakers=${bookmakers}`; // Add bookmakers only if provided
        }
        console.log(`Request set: ${apiUrl}`)
        // Make the request
        const response = await axios.get(apiUrl);
        
        // Show token usage in console
        console.log("Tokens Left:", response.headers['x-requests-remaining']);
        console.log("Tokens Used Total:", response.headers['x-requests-used']);
        console.log("Tokens Just Used:", response.headers['x-requests-last']);

        res.json(response.data); // Send odds to frontend
    } catch (error) {
        console.error("API request failed:", error);
        res.status(500).json({ error: "Failed to fetch odds" });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
