import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useLocation } from 'wouter';
import { SiteHeader } from '@/components/LiveTicker';

const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    paddingTop: '56px',
    paddingBottom: '80px',
  } as CSSProperties,
  wrap: {
    maxWidth: '920px',
    margin: '0 auto',
    padding: '0 24px',
  } as CSSProperties,
  hero: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 136px)',
    textAlign: 'center' as const,
  } as CSSProperties,
  title: {
    fontFamily: 'Cormorant Garamond, Georgia, serif',
    fontSize: 'clamp(36px, 5vw, 56px)',
    lineHeight: 1.05,
    margin: '0 0 18px',
    color: 'var(--text-primary)',
  } as CSSProperties,
  subtitle: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '15px',
    color: 'var(--text-secondary)',
    lineHeight: 1.75,
    maxWidth: '640px',
    margin: '0 auto 36px',
  } as CSSProperties,
  form: {
    display: 'grid',
    gap: '14px',
    width: '100%',
    maxWidth: '640px',
  } as CSSProperties,
  input: {
    height: '54px',
    borderRadius: '10px',
    border: '1px solid var(--border-light)',
    padding: '0 18px',
    fontFamily: 'Syne, sans-serif',
    fontSize: '15px',
    color: 'var(--text-primary)',
    background: 'var(--bg-surface)',
    outline: 'none',
  } as CSSProperties,
  button: {
    height: '54px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'Syne, sans-serif',
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    background: 'var(--accent, #C2536A)',
    cursor: 'pointer',
  } as CSSProperties,
  hint: {
    fontFamily: 'DM Mono, monospace',
    fontSize: '11px',
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-muted)',
  } as CSSProperties,
};

export function Home() {
  const [topic, setTopic] = useState('');
  const [, setLocation] = useLocation();
  const canSearch = topic.trim().length >= 3;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = topic.trim();
    if (!query) return;
    setLocation(`/analysis?topic=${encodeURIComponent(query)}`);
  };

  return (
    <div style={S.page}>
      <SiteHeader />
      <div style={S.wrap}>
        <div style={S.hero}>
          <p style={S.hint}>Search the conflict topic you care about</p>
          <h1 style={S.title}>Find the story behind the headlines.</h1>
          <p style={S.subtitle}>
            Enter a topic, location, or incident. The system will fetch intelligence, verify sources, and
            present a structured briefing in plain language.
          </p>

          <form style={S.form} onSubmit={handleSubmit}>
            <input
              type="search"
              value={topic}
              onChange={(event) => setTopic(event.currentTarget.value)}
              placeholder="e.g. Gaza conflict, Sudan civil war, Yemen humanitarian crisis"
              aria-label="Search topic"
              style={S.input}
            />
            <button type="submit" disabled={!canSearch} style={{ ...S.button, opacity: canSearch ? 1 : 0.5 }}>
              Search issue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
