import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { UserProvider } from './context/UserContext.jsx';
import { PlayerProvider } from './context/PlayerContext.jsx';
import { RecommendationProvider } from './context/RecommendationContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <PlayerProvider>
          <RecommendationProvider>
            <App />
          </RecommendationProvider>
        </PlayerProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
