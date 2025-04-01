// Convert American odds to implied probability
function americanToImpliedProbability(odds) {
  const rawImpliedProb = odds > 0
    ? 1 / (odds / 100 + 1)
    : 1 / (1 + 100 / Math.abs(odds));
  return parseFloat(rawImpliedProb.toFixed(4));
}

// Calculate normalized probabilities accounting for overround
function normalizeMarketProbabilities(market) {
  // Calculate total implied probability (including overround)
  const totalImpliedProb = market.outcomes.reduce((sum, outcome) => {
    return sum + americanToImpliedProbability(outcome.price);
  }, 0);

  // Normalize each outcome's probability to remove overround
  return market.outcomes.map(outcome => {
    const trueProb = americanToImpliedProbability(outcome.price) / totalImpliedProb;
    return {
      ...outcome,
      impliedProb: parseFloat(trueProb.toFixed(4)),
      trueImpliedProb: parseFloat((trueProb * 100).toFixed(2))
    };
  });
}

// Transform traditional odds data with proper probability normalization
function transformOddsData(oddsData) {
  const discrepancies = findOddsDiscrepancies(oddsData);
  return oddsData.map((event) => ({
    id: event.id,
    sport: event.sport_title,
    commence_time: event.commence_time,
    home_team: event.home_team,
    away_team: event.away_team,
    bookmakers: event.bookmakers.map((bookmaker) => ({
      key: bookmaker.key,
      title: bookmaker.title,
      overround: calculateBookmakerOverround(bookmaker),
      markets: bookmaker.markets.map((market) => {
        const normalizedOutcomes = normalizeMarketProbabilities(market);
        return {
          key: market.key,
          marketOverround: calculateMarketOverround(market),
          outcomes: normalizedOutcomes.map(outcome => ({
            name: outcome.name,
            price: outcome.price,
            impliedProb: outcome.impliedProb,
            trueImpliedProb: outcome.trueImpliedProb
          }))
        };
      }),
    })),
    discrepancies: discrepancies.find(
      (d) => d.game === `${event.away_team} @ ${event.home_team}`
    )?.discrepancies || [],
  }));
}

// Calculate bookmaker's total overround across all markets
function calculateBookmakerOverround(bookmaker) {
  let totalOverround = 0;
  bookmaker.markets.forEach(market => {
    totalOverround += calculateMarketOverround(market);
  });
  return parseFloat((totalOverround / bookmaker.markets.length).toFixed(2));
}

// Calculate overround for a single market
function calculateMarketOverround(market) {
  const totalImpliedProb = market.outcomes.reduce((sum, outcome) => {
    return sum + americanToImpliedProbability(outcome.price);
  }, 0);
  return parseFloat(((totalImpliedProb - 1) * 100).toFixed(2));
}

// Calculate bookmaker's total overround across all markets
function calculateBookmakerOverround(bookmaker) {
  let totalOverround = 0;
  bookmaker.markets.forEach(market => {
    totalOverround += calculateMarketOverround(market);
  });
  return parseFloat((totalOverround / bookmaker.markets.length).toFixed(2)) + '%';
}

// Calculate overround for a single market
function calculateMarketOverround(market) {
  const totalImpliedProb = market.outcomes.reduce((sum, outcome) => {
    return sum + americanToImpliedProbability(outcome.price);
  }, 0);
  return parseFloat(((totalImpliedProb - 1) * 100).toFixed(2));
}

// Updated discrepancy finder that uses true probabilities
function findOddsDiscrepancies(oddsData, threshold = 0.02) {
  return oddsData
    .filter((event) => event.bookmakers.length >= 2)
    .map((event) => {
      const game = `${event.away_team} @ ${event.home_team}`;
      const discrepancies = [];

      // Analyze H2H markets with normalized probabilities
      const h2hOutcomes = { home: [], away: [] };
      
      event.bookmakers.forEach((bookmaker) => {
        const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');
        if (!h2hMarket) return;

        const normalizedMarket = normalizeMarketProbabilities(h2hMarket);
        
        normalizedMarket.forEach(outcome => {
          const teamType = outcome.name === event.home_team ? 'home' : 'away';
          h2hOutcomes[teamType].push({
            bookmaker: bookmaker.title,
            price: outcome.price,
            impliedProb: parseFloat(outcome.impliedProb), // Normalized probability
            marketOverround: calculateMarketOverround(h2hMarket)
          });
        });
      });

      // Check for discrepancies using true probabilities
      ['home', 'away'].forEach((teamType) => {
        const outcomes = h2hOutcomes[teamType];
        if (outcomes.length < 2) return;

        const sorted = [...outcomes].sort((a, b) => a.impliedProb - b.impliedProb);
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        const diff = worst.impliedProb - best.impliedProb;

        if (diff > threshold) {
          discrepancies.push({
            market: 'h2h',
            team: teamType === 'home' ? event.home_team : event.away_team,
            best_value: {
              bookmaker: best.bookmaker,
              price: best.price,
              true_prob: parseFloat((best.impliedProb * 100).toFixed(2)) + '%',
              overround: best.marketOverround + '%'
            },
            worst_value: {
              bookmaker: worst.bookmaker,
              price: worst.price,
              true_prob: parseFloat((worst.impliedProb * 100).toFixed(2)) + '%',
              overround: worst.marketOverround + '%'
            },
            probability_diff: parseFloat((diff * 100).toFixed(2)) + '%',
            arbitrage_opportunity: diff > 0 ? (parseFloat((1/worst.impliedProb - 1/best.impliedProb) * 100).toFixed(2)) + '%' : '0%'
          });
        }
      });

      return { game, discrepancies };
    })
    .filter((game) => game.discrepancies.length > 0);
}

// Transform DFS player props data with normalized probabilities
function transformPlayerOddsData(oddsData) {
  const playerOdds = {};
  oddsData.bookmakers.forEach((bookmaker) => {
    bookmaker.markets.forEach((market) => {
      const normalizedMarket = normalizeMarketProbabilities(market);
      normalizedMarket.forEach((outcome) => {
        const playerName = outcome.description;
        if (!playerOdds[playerName]) playerOdds[playerName] = {};
        if (!playerOdds[playerName][outcome.name]) {
          playerOdds[playerName][outcome.name] = {
            point: outcome.point,
            books: {},
          };
        }
        playerOdds[playerName][outcome.name].books[bookmaker.key] = {
          title: bookmaker.title,
          price: outcome.price,
          trueImpliedProb: outcome.trueImpliedProb,
          marketOverround: calculateMarketOverround(market) + '%'
        };
      });
    });
  });
  return playerOdds;
}
  
  module.exports = {
    americanToImpliedProbability,
    normalizeMarketProbabilities,
    calculateMarketOverround,
    transformOddsData,
    findOddsDiscrepancies,
    transformPlayerOddsData,
  };