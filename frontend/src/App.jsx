import { useState, useEffect } from 'react';

function App() {
  const [oddsData, setOddsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/odds')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        setOddsData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!oddsData) return <div>No data found</div>;

  return (
    <div>
      <h1>Sports Odds</h1>
      <pre>{JSON.stringify(oddsData, null, 2)}</pre>
    </div>
  );
}

export default App;