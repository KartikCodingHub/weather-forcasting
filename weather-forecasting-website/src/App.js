import React, { useState } from 'react';
import Button from './components/Button';
import WeatherDisplay from './components/WeatherDisplay';

const App = () => {
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchWeatherData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('https://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q=London');
            if (!response.ok) {
                throw new Error('Failed to fetch weather data');
            }
            const data = await response.json();
            setWeatherData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App">
            <h1>Weather Forecasting</h1>
            <Button label="Get Weather" onClick={fetchWeatherData} />
            {loading && <p>Loading...</p>}
            {error && <p>Error: {error}</p>}
            {weatherData && (
                <WeatherDisplay
                    temperature={weatherData.current.temp_c}
                    condition={weatherData.current.condition.text}
                    location={weatherData.location.name}
                />
            )}
        </div>
    );
};

export default App;