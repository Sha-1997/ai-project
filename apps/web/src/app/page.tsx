"use client";

import React, { useState, useEffect } from "react";

// ==============================================================================
// MOCK INTEGRATION API CLIENTS (Consumed from backend platforms)
// ==============================================================================
interface Plan {
  code: string;
  name: string;
  price: string;
  currency: string;
  duration: string;
  lockYears: number;
}

const mockPlans: Plan[] = [
  { code: "FOUNDER", name: "Founder Member", price: "49", currency: "AED", duration: "year", lockYears: 3 },
  { code: "EARLY", name: "Early Access Offer", price: "99", currency: "AED", duration: "year", lockYears: 3 },
  { code: "GROWTH", name: "Growth Adopter", price: "199", currency: "AED", duration: "year", lockYears: 3 },
  { code: "EXPANSION", name: "Expansion Tier", price: "249", currency: "AED", duration: "year", lockYears: 3 },
  { code: "SCALE", name: "Scale Operator", price: "299", currency: "AED", duration: "year", lockYears: 2 },
  { code: "GLOBAL", name: "Global Enterprise", price: "399", currency: "AED", duration: "year", lockYears: 2 },
  { code: "STANDARD", name: "Standard Membership", price: "499", currency: "AED", duration: "year", lockYears: 0 },
];

export default function LaunchLandingPage() {
  // Page states
  const [seatsRemaining, setSeatsRemaining] = useState<number>(542);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [challengeName, setChallengeName] = useState("");
  const [challengeSubmitted, setChallengeSubmitted] = useState(false);

  // Form registration states
  const [regForm, setRegForm] = useState({ name: "", email: "", mobile: "", country: "AE", password: "" });
  const [regSuccess, setRegSuccess] = useState(false);

  // Analytics logging mock helper
  const trackEvent = (eventName: string, metadata?: any) => {
    console.log(`[Analytics Event] Name: ${eventName}`, metadata || {});
    // In production, maps to window.analytics.track(eventName, metadata);
  };

  // Launch Target: August 1, 2026 00:00:00 GST
  const LAUNCH_DATE_MS = new Date("2026-08-01T00:00:00+04:00").getTime();

  useEffect(() => {
    trackEvent("PAGE_VIEW", { url: "/" });

    // Tick countdown clock
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = LAUNCH_DATE_MS - now;

      if (diff <= 0) {
        clearInterval(interval);
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Form actions
  const handleCheckoutClick = (planCode: string) => {
    trackEvent("PAYMENT_START", { planCode });
    // Triggers redirection interface to payment processing sessions:
    alert(`Redirecting to Stripe checkout for plan: ${planCode}. 5% UAE VAT will apply for AE addresses.`);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent("REGISTRATION_SUBMIT", { country: regForm.country });
    setRegSuccess(true);
    alert("Registration successful! OTP verification code dispatched to email.");
  };

  const handleChallengeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeName.trim()) return;
    trackEvent("CHALLENGE_SUBMITTED", { proposal: challengeName });
    setChallengeSubmitted(true);
  };

  return (
    <div className="launch-container">
      {/* 1. TOP HEADER BANNER */}
      <header className="main-header">
        <div className="logo-section">
          <span className="logo-icon">🚀</span>
          <span className="logo-text">JovianeX AI</span>
        </div>
        <nav className="nav-links">
          <a href="#vision" onClick={() => trackEvent("NAV_CLICK", { section: "vision" })}>Vision</a>
          <a href="#roadmap" onClick={() => trackEvent("NAV_CLICK", { section: "roadmap" })}>Roadmap</a>
          <a href="#pricing" onClick={() => trackEvent("NAV_CLICK", { section: "pricing" })}>Pricing</a>
          <a href="#founder" onClick={() => trackEvent("NAV_CLICK", { section: "founder" })}>Founder</a>
          <a href="#register" className="btn-cta-secondary">Join Free</a>
        </nav>
      </header>

      {/* 2. HERO SECTION WITH COUNTDOWN */}
      <section className="hero-section">
        <h1 className="hero-title">Unified AI Ecosystem</h1>
        <p className="hero-subtitle">
          One Membership. Access to multiple state-of-the-art AI-powered modules.
        </p>

        <div className="countdown-box">
          <span className="countdown-label">COUNTDOWN TO GLOBAL LAUNCH:</span>
          <div className="countdown-timer">
            <div className="time-block">
              <span className="time-num">{countdown.days}</span>
              <span className="time-lbl">Days</span>
            </div>
            <div className="time-block">
              <span className="time-num">{countdown.hours}</span>
              <span className="time-lbl">Hours</span>
            </div>
            <div className="time-block">
              <span className="time-num">{countdown.minutes}</span>
              <span className="time-lbl">Minutes</span>
            </div>
            <div className="time-block">
              <span className="time-num">{countdown.seconds}</span>
              <span className="time-lbl">Seconds</span>
            </div>
          </div>
        </div>

        <div className="hero-ctas">
          <a href="#pricing" className="btn-cta-primary" onClick={() => trackEvent("CTA_CLICK", { source: "hero_founder" })}>
            Become a Founding Member
          </a>
          <a href="#register" className="btn-cta-secondary" onClick={() => trackEvent("CTA_CLICK", { source: "hero_free" })}>
            Claim Free Account
          </a>
        </div>
      </section>

      {/* 3. VISION SECTION */}
      <section id="vision" className="content-section text-center">
        <h2>Our Core Vision</h2>
        <p className="section-intro">
          Why manage multiple billing subscriptions for different AI products? JovianeX consolidates your toolsets into one cohesive workspace.
        </p>
        <div className="vision-grid">
          <div className="vision-card">
            <h3>Consolidated Platform</h3>
            <p>Single billing access keys unlock everything from AI Jobs down to Logistics pipelines.</p>
          </div>
          <div className="vision-card">
            <h3>Multi-Region Scale</h3>
            <p>Built-in support for multiple currencies (AED base) and fully localized services.</p>
          </div>
          <div className="vision-card">
            <h3>Enterprise Identity</h3>
            <p>Unified credentials protect profile databases using secure MFA OTP controls.</p>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE MODULE ROADMAP */}
      <section id="roadmap" className="content-section">
        <h2 className="text-center">Interactive Roadmap</h2>
        <div className="roadmap-timeline">
          <div className="timeline-item active">
            <span className="timeline-badge">August 1, 2026</span>
            <h3>AI Jobs MVP</h3>
            <p className="roadmap-status">🔴 Launching Wave 1</p>
            <p>Advanced resume parsing, automated application routing, and job market analyzers engines.</p>
          </div>
          <div className="timeline-item">
            <span className="timeline-badge">October 2026</span>
            <h3>AI Delivery</h3>
            <p className="roadmap-status">🟡 Wave 2</p>
            <p>Dynamic vehicle routing, fleet management pipelines, and delivery time forecaster models.</p>
          </div>
          <div className="timeline-item">
            <span className="timeline-badge">November 2026</span>
            <h3>AI Travel</h3>
            <p className="roadmap-status">🟡 Wave 3</p>
            <p>Intelligent itinerary generation, pricing predictions, and booking integration helpers.</p>
          </div>
          <div className="timeline-item">
            <span className="timeline-badge">January 2027</span>
            <h3>Logistics Sync</h3>
            <p className="roadmap-status">🟡 Wave 4</p>
            <p>Multi-carrier API mapping, warehouse inventory trackers, and customs routing logs.</p>
          </div>
        </div>
      </section>

      {/* 5. DYNAMIC PRICING MATRIX */}
      <section id="pricing" className="content-section">
        <h2 className="text-center">Subscription Matrix</h2>
        <div className="pricing-grid">
          {mockPlans.map((plan) => (
            <div className={`pricing-card ${plan.code === "FOUNDER" ? "featured" : ""}`} key={plan.code}>
              {plan.code === "FOUNDER" && <span className="featured-ribbon">Best Value</span>}
              <h3>{plan.name}</h3>
              <div className="price-display">
                <span className="price-num">{plan.price}</span>
                <span className="price-currency">{plan.currency}/{plan.duration}</span>
              </div>
              {plan.lockYears > 0 ? (
                <p className="lock-tag">🔐 Price locked for {plan.lockYears} Years</p>
              ) : (
                <p className="lock-tag">Standard renewal pricing</p>
              )}
              <button className="btn-card" onClick={() => handleCheckoutClick(plan.code)}>
                Secure Plan
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FOUNDER SEATS CAMPAIGN & CHALLENGE */}
      <section id="founder" className="content-section featured-bg">
        <div className="founder-header text-center">
          <h2>Founding Member Campaign</h2>
          <div className="seats-remaining-widget">
            <span className="seats-count">{seatsRemaining}</span>
            <span className="seats-lbl">FOUNDER SEATS REMAINING</span>
          </div>
          <p className="campaign-note">
            Reserved exclusively for the first 1,000 successful paid members. Free registration does not reserve a seat.
          </p>
        </div>

        {/* Naming Challenge Input */}
        <div className="challenge-box">
          <h3>Community Naming Challenge</h3>
          <p>Help us name the exclusive Founding Member community channel. Submit your proposal below.</p>
          {challengeSubmitted ? (
            <div className="alert alert-success">
              Thank you for submitting! Results will be announced on August 17, 2026.
            </div>
          ) : (
            <form onSubmit={handleChallengeSubmit} className="challenge-form">
              <input
                type="text"
                value={challengeName}
                onChange={(e) => setChallengeName(e.target.value)}
                placeholder="Enter community name proposal (e.g. Jovian Pioneers)"
                required
              />
              <button type="submit" className="btn-cta-primary">Submit Name</button>
            </form>
          )}
        </div>
      </section>

      {/* 7. FREE REGISTRATION PANEL */}
      <section id="register" className="content-section">
        <h2 className="text-center">Claim Your Free Account</h2>
        <div className="form-wrapper">
          {regSuccess ? (
            <div className="alert alert-success">
              Registration request recorded successfully. Please check your inbox for verification code inputs.
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="registration-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={regForm.mobile}
                  onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <select
                  value={regForm.country}
                  onChange={(e) => setRegForm({ ...regForm, country: e.target.value })}
                >
                  <option value="AE">United Arab Emirates</option>
                  <option value="SA">Saudi Arabia</option>
                  <option value="OM">Oman</option>
                  <option value="QA">Qatar</option>
                  <option value="BH">Bahrain</option>
                  <option value="KW">Kuwait</option>
                </select>
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                />
              </div>
              <button type="submit" className="btn-submit">Register Account</button>
            </form>
          )}
        </div>
      </section>

      {/* 8. GIVEAWAY CAMPAIGN SECTION */}
      <section className="content-section dark-bg">
        <h2 className="text-center text-white">Giveaway Launch Campaign</h2>
        <div className="giveaway-details text-center">
          <p className="giveaway-intro">
            To celebrate the global launch of the AI Ecosystem, every active Founding Member is automatically entered into our launch giveaway.
          </p>
          <div className="giveaway-timeline">
            <div>
              <strong>Launch Date:</strong> September 1, 2026
            </div>
            <div>
              <strong>Campaign Closes:</strong> January 31, 2027
            </div>
            <div>
              <strong>Draw Announcement:</strong> February 5, 2027
            </div>
          </div>
          <p className="giveaway-terms-link">
            <a href="#terms" className="text-white">View Official Giveaway Terms and Conditions</a>
          </p>
        </div>
      </section>

      {/* 9. REFERRAL INFORMATION SECTION */}
      <section className="content-section">
        <h2 className="text-center">Referral Program</h2>
        <p className="section-intro text-center">
          Invite friends and earn rewards when they join the JovianeX Founding Member program.
        </p>
        <div className="referral-box text-center">
          <p><strong>Reward Structure:</strong> Earn commissions and platform credits for every successful payment generated via your invite codes.</p>
          <p className="referral-warning">
            ⚠️ Invite link generation is restricted to registered members only. Please log in or sign up to claim your code.
          </p>
        </div>
      </section>

      {/* 10. FAQ SYSTEM */}
      <section className="content-section">
        <h2 className="text-center">Frequently Asked Questions</h2>
        <div className="faq-wrapper">
          <div className="faq-item">
            <h4>What is a Founding Member?</h4>
            <p>Founding Members are the first 1,000 paid subscribers who secure locked pricing of 49 AED/year for 3 years, custom badge icons, and private forum access.</p>
          </div>
          <div className="faq-item">
            <h4>When does the pricing lock expire?</h4>
            <p>Pricing locks remain active for 3 years for Founder, Early, Growth, and Expansion tiers, provided the membership is not canceled or expired.</p>
          </div>
          <div className="faq-item">
            <h4>How do I qualify for the giveaway?</h4>
            <p>Every active Founding Member who registers during the campaign window (Sept 1, 2026 - Jan 31, 2027) is automatically entered into the draw.</p>
          </div>
        </div>
      </section>

      {/* 11. FOOTER & LEGAL LINKS */}
      <footer className="main-footer">
        <div className="footer-links">
          <a href="#terms">Terms of Service</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#refund">Refund Policy</a>
          <a href="#founder-terms">Founder Terms</a>
        </div>
        <p className="copyright-text">
          &copy; 2026 JovianeX AI. All rights reserved. Regional billing addresses are subject to local compliance laws.
        </p>
      </footer>
    </div>
  );
}
