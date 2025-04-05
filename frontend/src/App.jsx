import { useState, useEffect } from 'react';

function App() {
  const [oddsData, setOddsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    sport: 'all',
    bookmaker: 'all'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Add query parameters based on filters
        const params = new URLSearchParams();
        if (filters.sport !== 'all') params.append('sport', filters.sport);
        if (filters.bookmaker !== 'all') params.append('bookmakers', filters.bookmaker);
        
        const response = await fetch(`http://localhost:3000/api/odds?${params.toString()}`);
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        setOddsData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]); // Re-fetch when filters change

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!oddsData) return <div>No data found</div>;

  return (
    <div className="odds-container">
      <h1>StatGoat - Sports Odds</h1>
      
      {/* Filter Controls */}
      <div className="filters">
        <select name="sport" value={filters.sport} onChange={handleFilterChange}>
          <option value="all">All Sports</option>
          <option value="basketball_nba">NBA</option>
          <option value="americanfootball_nfl">NFL</option>
          <option value="americanfootball_ncaaf">NCAAF</option>
          <option value="icehockey_nhl">NHL</option>
          <option value="soccer_usa_mls">MLS</option>


          {/* Add more sports as needed */}
        </select>
        
        <select name="bookmaker" value={filters.bookmaker} onChange={handleFilterChange}>
          <option value="all">All Bookmakers</option>
          <option value="draftkings">DraftKings</option>
          <option value="fanduel">FanDuel</option>
          <option value="betmgm">BetMgm</option>
          <option value="mybookieag">MyBookie.ag</option>

        </select>
      </div>
      
      {/* Data Display */}
      <div className="odds-grid">
        {oddsData.map(event => (
          <div key={event.id} className="event-card">
            <h3>{event.sport_title}</h3>
            <p>{event.home_team} vs {event.away_team}</p>
            <p>Starts: {new Date(event.commence_time).toLocaleString()}</p>
            
            <div className="odds-list">
              {event.bookmakers?.map(bookmaker => (
                <div key={bookmaker.key} className="bookmaker">
                  <h4>{bookmaker.title}</h4>
                  <ul>
                    {bookmaker.markets.find(m => m.key === 'h2h')?.outcomes.map(outcome => (
                      <li key={outcome.name}>
                        {outcome.name}: {outcome.price} 
                        <span> (Adjusted Probability: {(outcome.impliedProb * 100).toFixed(1)}%)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;