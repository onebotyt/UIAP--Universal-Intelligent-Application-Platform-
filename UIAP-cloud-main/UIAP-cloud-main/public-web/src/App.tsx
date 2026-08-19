import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { Setup } from './pages/Setup';
import { Download } from './pages/Download';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="site-header">
          <div className="logo">UIAP Cloud</div>
          <nav className="site-nav">
            <a href="/">Home</a>
            <a href="/download">Download</a>
            <a href="/login" className="btn-ghost">Login</a>
            <a href="/register" className="btn-primary">Get Started</a>
          </nav>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/download" element={<Download />} />
          </Routes>
        </main>
        
        <footer className="site-footer">
          <p>© {new Date().getFullYear()} Unified Identity and Attendance Platform</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
