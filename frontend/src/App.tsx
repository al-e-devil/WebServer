import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

import './App.module.css';
import TiktokPage from './pages/download/Tiktok';
import SpotifyPage from './pages/download/Spotify';

function App() {
    return (
        <Router>
            <div className="app-container">
                <main>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/tiktok" element={<TiktokPage />} />
                        <Route path="/spotify" element={<SpotifyPage />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;