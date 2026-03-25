import { useState, useEffect } from "react";
import { Agentation } from "agentation";

const WINDOWS = [
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

function fmtUsd(v) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v || 0));
}

function fmtVol(v) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v || 0));
}

function fmtRate(v) {
  return (Number(v || 0) * 100).toFixed(4) + "%";
}

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    address: p.get("address") || "",
    window: WINDOWS.some((w) => w.value === p.get("window"))
      ? p.get("window")
      : "7d",
  };
}

function syncUrl(address, win) {
  const p = new URLSearchParams();
  if (address) p.set("address", address);
  if (win) p.set("window", win);
  const q = p.toString();
  window.history.replaceState(
    {},
    "",
    q ? `${window.location.pathname}?${q}` : window.location.pathname
  );
}

function modeLabel(mode) {
  if (mode === "exact_from_fill_fees") return "Exact fill fees";
  if (mode === "estimate_from_user_fees_daily_breakdown")
    return "Daily volume estimate";
  return "Portfolio blended rate";
}

/* Card wrapper with 4 L-shaped corner ornaments */
function Card({ children, className = "" }) {
  return (
    <div className={`card ${className}`}>
      {/* TL: ┌ shape */}
      <svg className="corner-mark corner-tl" width="4" height="4" viewBox="0 0 4 4" fill="none">
        <path d="M0 0H4V1H1V4H0V0Z" fill="#2b2b30" />
      </svg>
      {/* TR: ┐ shape */}
      <svg className="corner-mark corner-tr" width="4" height="4" viewBox="0 0 4 4" fill="none">
        <path d="M0 0H4V4H3V1H0V0Z" fill="#2b2b30" />
      </svg>
      {/* BL: └ shape */}
      <svg className="corner-mark corner-bl" width="4" height="4" viewBox="0 0 4 4" fill="none">
        <path d="M0 0H1V3H4V4H0V0Z" fill="#2b2b30" />
      </svg>
      {/* BR: ┘ shape */}
      <svg className="corner-mark corner-br" width="4" height="4" viewBox="0 0 4 4" fill="none">
        <path d="M4 0V4H0V3H3V0H4Z" fill="#2b2b30" />
      </svg>
      {children}
    </div>
  );
}

function StatCard({ label, value, small }) {
  return (
    <Card className="stat-card">
      <span className="stat-label">{label}</span>
      <span className={`stat-value${small ? " stat-value-sm" : ""}`}>
        {value}
      </span>
    </Card>
  );
}

function DataRow({ label, value, wrap }) {
  return (
    <tr className={wrap ? "wrap-row" : undefined}>
      <td>{label}</td>
      <td>{value}</td>
    </tr>
  );
}

function Section({ label, children }) {
  return (
    <tbody>
      <tr className="section-row">
        <td colSpan={2}>{label}</td>
      </tr>
      {children}
    </tbody>
  );
}

function BreakdownTable({ data }) {
  if (!data) return null;
  return (
    <div className="breakdown">
      <div className="breakdown-header">
        <h2>Breakdown</h2>
        <span className="resolved-addr">
          {data.address.slice(0, 6)}...{data.address.slice(-4)}
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>

          <Section label="Volume">
            <DataRow
              label="Requested perp volume"
              value={"$" + fmtVol(data.requested_perp_volume)}
            />
          </Section>

          <Section label="Rates">
            <DataRow
              label="Blended perp rate"
              value={fmtRate(data.recent_blended_perp_rate)}
            />
            <DataRow
              label="Perp taker rate"
              value={fmtRate(data.current_rates?.perp_taker_rate)}
            />
            <DataRow
              label="Perp maker rate"
              value={fmtRate(data.current_rates?.perp_maker_rate)}
            />
          </Section>

          <Section label="Methodology">
            <DataRow label="Fee assumption" value={data.fee_assumption} />
            <DataRow label="Coverage" value={data.coverage_note} wrap />
          </Section>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const initial = getParams();
  const [address, setAddress] = useState(initial.address);
  const [win, setWin] = useState(initial.window);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    syncUrl(address, win);
  }, [address, win]);

  useEffect(() => {
    if (initial.address && initial.window) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/v1/hyperliquid/savings-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim(), window: win }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.detail === "string" ? data.detail : "Request failed"
        );
      }
      setResult(data);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="page-shell">
        <div className="header">
          <h1>Fee Savings Estimate</h1>
          <p>
            Estimate Hyperliquid trading fees and compare against Lighter&apos;s
            zero-fee standard accounts.
          </p>
        </div>

        <Card className="main-card">
          <div className="form-card">
            <form className="lookup-form" onSubmit={handleSubmit}>
              <label className="field">
                <span className="field-label">Address</span>
                <input
                  type="text"
                  placeholder="0x..."
                  autoComplete="off"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </label>

              <label className="field field-small">
                <span className="field-label">Window</span>
                <select value={win} onChange={(e) => setWin(e.target.value)}>
                  {WINDOWS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </label>

              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Loading..." : "Estimate"}
              </button>
            </form>

            {(loading || error) && (
              <div className={`status${error ? " status-error" : ""}`}>
                {error || "Loading..."}
              </div>
            )}
          </div>

          {result && (
            <>
            <hr className="divider" />
            <div className="primary-metric">
              <span className="stat-label">Estimated Savings</span>
              <div className="primary-value-row">
                <span className="primary-value">
                  {fmtUsd(result.estimated_savings)}
                </span>
                <button
                  className="btn btn-share"
                  type="button"
                  onClick={() => {
                    const url = window.location.href;
                    if (navigator.share) {
                      navigator.share({ title: "Fee Savings Estimate", url });
                    } else {
                      navigator.clipboard.writeText(url);
                    }
                  }}
                >
                  Share
                  <svg width="16" height="16" viewBox="0 0 256 256" fill="none">
                    <path d="M176 160a39.89 39.89 0 0 0-28.62 12.09l-46.1-29.63a39.8 39.8 0 0 0 0-28.92l46.1-29.63a40 40 0 1 0-8.66-13.45l-46.1 29.63a40 40 0 1 0 0 55.82l46.1 29.63A40 40 0 1 0 176 160Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
              <span className="primary-footnote">
                {modeLabel(result.estimation_mode)}
              </span>
            </div>
            </>
          )}
        </Card>

        {result && (
          <div className="results">
            <BreakdownTable data={result} />
          </div>
        )}
      </main>

      <div className="fade-bottom" />
      <Agentation />
    </>
  );
}
