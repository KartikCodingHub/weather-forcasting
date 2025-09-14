import React from 'react';

const WeatherDisplay = ({ temperature, condition, location }) => {
    return (
        <div className="weather-display">
            <h2>Weather in {location}</h2>
            <p>Temperature: {temperature}°C</p>
            <p>Condition: {condition}</p>
        </div>
    );
};

export default WeatherDisplay;