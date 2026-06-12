import { useState, useEffect } from 'react';
import type { StorageData } from './content/storage';
import browser from 'webextension-polyfill';

// Decorative mono glyph strip, à la tday.com section dividers.
const GLYPHS = '·:|>*0/·=1·<=|>/|·*|<>0|:/<=:>0*0><0|:/';

function App() {
  const [count, setCount] = useState(0);
  const [moneySaved, setMoneySaved] = useState(0);
  const [weeklySaved, setWeeklySaved] = useState(0);
  const [blockedPurchases, setBlockedPurchases] = useState(0);
  const [totalImpulses, setTotalImpulses] = useState(0);
  const [impulsesResisted, setImpulsesResisted] = useState(0);

  // Calculate success rate
  const successRate = totalImpulses > 0
    ? Math.round((blockedPurchases / totalImpulses) * 100)
    : 0;

  // Load data from storage on mount
  useEffect(() => {
    browser.storage.local.get([
      'count',
      'moneySaved',
      'weeklySaved',
      'blockedPurchases',
      'totalImpulses',
      'impulsesResisted'
    ]).then((result: Partial<StorageData>) => {
      setCount(result.count || 0);
      setMoneySaved(result.moneySaved || 0);
      setWeeklySaved(result.weeklySaved || 0);
      setBlockedPurchases(result.blockedPurchases || 0);
      setTotalImpulses(result.totalImpulses || 0);
      setImpulsesResisted(result.impulsesResisted || 0);
    });
  }, []);

  // Listen for storage changes in real-time
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: browser.Storage.StorageChange }) => {
      if (changes.moneySaved) {
        setMoneySaved((changes.moneySaved.newValue as number) || 0);
      }
      if (changes.weeklySaved) {
        setWeeklySaved((changes.weeklySaved.newValue as number) || 0);
      }
      if (changes.count) {
        setCount((changes.count.newValue as number) || 0);
      }
      if (changes.blockedPurchases) {
        setBlockedPurchases((changes.blockedPurchases.newValue as number) || 0);
      }
      if (changes.totalImpulses) {
        setTotalImpulses((changes.totalImpulses.newValue as number) || 0);
      }
      if (changes.impulsesResisted) {
        setImpulsesResisted((changes.impulsesResisted.newValue as number) || 0);
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleClick = () => {
    const newCount = count + 1;
    setCount(newCount);
    browser.storage.local.set({ count: newCount });
  };

  return (
    <div className="ig-popup">
      <header className="ig-header">
        <div className="ig-brand">
          <span className="ig-chip">$</span>
          <span className="ig-wordmark">impulse guard</span>
        </div>
        <span className="ig-status">● Active</span>
      </header>

      <section className="ig-hero">
        <p className="ig-eyebrow">[ Money saved ]</p>
        <p className="ig-figure">${moneySaved.toFixed(2)}</p>
        <p className="ig-weekly">
          <span className="ig-weekly-up">↑ ${weeklySaved.toFixed(2)}</span> this week
        </p>
      </section>

      <section className="ig-stats">
        <div className="ig-stat">
          <span className="ig-stat-value">{blockedPurchases}</span>
          <span className="ig-stat-label">Blocked</span>
        </div>
        <div className="ig-stat">
          <span className="ig-stat-value">{impulsesResisted}</span>
          <span className="ig-stat-label">Resisted</span>
        </div>
        <div className="ig-stat">
          <span className="ig-stat-value">{successRate}%</span>
          <span className="ig-stat-label">Success</span>
        </div>
      </section>

      <p className="ig-note">No pending purchases. You're doing great.</p>

      <button className="ig-cta" onClick={handleClick}>
        View savings report
      </button>

      <footer className="ig-footer">
        <div className="ig-glyphs" aria-hidden="true">{GLYPHS}</div>
        <p className="ig-microcopy">
          Guarding since Jan 2025 · {count} sessions
        </p>
      </footer>
    </div>
  );
}

export default App;
