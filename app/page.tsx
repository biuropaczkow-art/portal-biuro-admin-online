"use client";

import { RainBackground } from "../components/RainBackground";

export default function Home() {
  return (
    <main className="glass-theme">
      <RainBackground />
      
      <div className="app-container">
        
        {/* Navbar */}
        <nav className="glass">
          <div className="logo-area" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '28px', fontStyle: 'italic', fontWeight: 600 }}>S</div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <strong style={{ fontSize: '18px', fontWeight: 600 }}>Sterling</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Financial Advisors</span>
            </div>
          </div>
          <div className="nav-links">
            <a href="#">Services ⌄</a>
            <a href="#">Industries</a>
            <a href="#">Insights</a>
            <a href="#">About Us</a>
            <a href="#">Contact</a>
          </div>
          <a href="#" className="btn">Client Portal</a>
        </nav>

        {/* Hero */}
        <div className="hero">
          <h1>Navigating Your Financial<br/>Future with Precision.</h1>
          <p>Expert Accounting, Tax, and Advisory Services for Businesses & Individuals.</p>
          <a href="#" className="btn btn-glow">Schedule a Consultation</a>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
            
          {/* Lewa karta */}
          <div className="card glass">
            <div className="solutions-header">
              <h2>Our Accounting Solutions</h2>
              <p>Expert Accounting, Tax, and Advisory Services for services for Businesses & individuals.</p>
            </div>
            
            <div className="solutions-grid">
              <div className="solution-item">
                <div className="icon-wrapper">💰</div>
                <h3>Tax Planning</h3>
                <p>Planning tax proving and trends of tax planning for common requirements.</p>
              </div>
              <div className="solution-item">
                <div className="icon-wrapper">🔍</div>
                <h3>Corporate Audit</h3>
                <p>Corporate audit to ensure tax, and customs for Businesses & Individuals.</p>
              </div>
              <div className="solution-item">
                <div className="icon-wrapper">📑</div>
                <h3>Bookkeeping</h3>
                <p>Bookkeeping information security, and management communications.</p>
              </div>
              <div className="solution-item">
                <div className="icon-wrapper">📈</div>
                <h3>Financial Reporting</h3>
                <p>Financial reporting, more financial reporting, and financial reporting.</p>
              </div>
            </div>
          </div>

          {/* Prawa kolumna */}
          <div className="right-column">
            <div className="card glass why-choose">
              <h3>Why Choose Sterling?</h3>
              <div className="feature-list">
                <div className="feature-item">
                  <h4>Experience</h4>
                  <p>Experience in valuation and comments.</p>
                </div>
                <div className="feature-item">
                  <h4>Precision</h4>
                  <p>Ensure results and investments.</p>
                </div>
                <div className="feature-item">
                  <h4>Results</h4>
                  <p>Experience enthusiastic and results.</p>
                </div>
              </div>
            </div>

            <div className="card glass">
              <div className="insights-header">
                <h3>Client Insights</h3>
                <div style={{ cursor: 'pointer' }}>⋮</div>
              </div>
              <div className="quote">
                "I have a colare doler sit amet is our testimonial . and asled tretimon oe our customerrs and business and far the communiter future."
              </div>
              <div className="author">
                <div className="avatar"></div>
                <div className="author-name">Serole Kaprier</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="glass">
          <div className="footer-grid">
            <div className="footer-col">
              <h4>Contact Info</h4>
              <p>+1 (525) 355-7880</p>
              <p>sterlingfavisors.com</p>
            </div>
            <div className="footer-col">
              <h4>Address & Route City</h4>
              <p>223 Main Street</p>
              <p>London, USA</p>
            </div>
            <div className="footer-col">
              <h4>Links</h4>
              <a href="#">About Us</a>
              <a href="#">Careers</a>
            </div>
            <div className="footer-col">
              <h4>About Us</h4>
              <a href="#">Progs</a>
              <a href="#">Contact</a>
            </div>
            <div className="footer-col" style={{ textAlign: 'right' }}>
              <a href="#" style={{ color: 'var(--primary-blue)', fontWeight: 500 }}>Client Portal</a>
            </div>
          </div>
          <div className="footer-bottom">
            © 2024 Sterling Financial Advisors
          </div>
        </footer>

      </div>
    </main>
  );
}
