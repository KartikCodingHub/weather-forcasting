import React from 'react';

const Button = ({ label, onClick }) => {
    return (
        <button onClick={onClick} className="weather-button">
            {label}
        </button>
    );
};

export default Button;