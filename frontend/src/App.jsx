import { useState } from 'react'
import './App.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = {
  pct: (v, d = 1) => v == null ? 'N/A' : `${(v * 100).toFixed(d)}%`,
  pctRaw: (v, d = 1) => v == null ? 'N/A' : `${v.toFixed(d)}%`,
  price: (v) => v == null ? 'N/A' : `$${v.toFixed(2)}`,
  ratio: (v, d = 2) => v == null ? 'N/A' : v.toFixed(d),
  large: (v) => {
    if (v == null) return 'N/A'
    const s = v < 0 ? '-' : ''
    const a = Math.abs(v)
    if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`
    if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`
    if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`
    return `${s}$${a.toLocaleString()}`
  },
}

const COLORS = {
  positive: { background: '#E1F5EE', color: '#0F6E56' },
  negative: { background: '#FAECE7', color: '#993C1D' },
  warning:  { background: '#FAEEDA', color: '#633806' },
  ticker:   { background: '#EEEDFE', color: '#3C3489' },
}

function signColor(v) {
  if (v == null) return null
  return v > 0 ? 'positive' : 'negative'
}

function shortColor(v) {
  if (v == null) return null
  const p = v * 100
  if (p < 5) return 'positive'
  if (p <= 15) return 'warning'
  return 'negative'
}

function pegColor(v) {
  if (v == null) return null
  if (v < 1) return 'positive'
  if (v <= 2) return 'warning'
  return 'negative'
}

const REC_LABEL = {
  strong_buy: 'קנייה חזקה', buy: 'קנייה',
  hold: 'החזקה', sell: 'מכירה', underperform: 'ביצוע חסר',
}
const REC_COLOR = {
  strong_buy: 'positive', buy: 'positive',
  hold: 'warning', sell: 'negative', underperform: 'negative',
}

// ── Shared Components ─────────────────────────────────────────────────────────

function MetricCard({ label, value, colorKey, subtitle }) {
  return (
    <div className="metric-card" style={colorKey ? COLORS[colorKey] : {}}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value ?? 'N/A'}</div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  )
}

function QuickStat({ label, value, colorKey }) {
  return (
    <div className="quick-stat" style={colorKey ? COLORS[colorKey] : {}}>
      <div className="qs-label">{label}</div>
      <div className="qs-value">{value ?? 'N/A'}</div>
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function TabReports({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard label="צמיחת הכנסות YoY" value={fmt.pct(d.revenueGrowth)} colorKey={signColor(d.revenueGrowth)} />
      <MetricCard label="צמיחת רווח EPS YoY" value={fmt.pct(d.earningsGrowth)} colorKey={signColor(d.earningsGrowth)} />
      <MetricCard label="Gross Margin" value={fmt.pct(d.grossMargin)} />
      <MetricCard label="הכנסות TTM" value={d.revenueTTMFormatted || fmt.large(d.revenueTTM)} />
      <MetricCard label="רווח נקי TTM" value={d.netIncomeTTMFormatted || fmt.large(d.netIncomeTTM)} colorKey={signColor(d.netIncomeTTM)} />
      <MetricCard label="Free Cash Flow" value={d.freeCashflowFormatted || fmt.large(d.freeCashflow)} colorKey={signColor(d.freeCashflow)} />
      <MetricCard label="רבעון אחרון שדווח" value={d.mostRecentQuarter} />
      <MetricCard label="דוח הבא (קירוב)" value={d.nextEarningsApprox} />
    </div>
  )
}

function TabValuation({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard label="P/E Trailing" value={fmt.ratio(d.trailingPE)} />
      <MetricCard label="P/E Forward" value={fmt.ratio(d.forwardPE)} />
      <MetricCard label="P/S" value={fmt.ratio(d.priceToSales)} />
      <MetricCard label="EV/EBITDA" value={fmt.ratio(d.evToEbitda)} />
      <MetricCard label="PEG Ratio" value={fmt.ratio(d.pegRatio)} colorKey={pegColor(d.pegRatio)} />
      <MetricCard label="P/B" value={fmt.ratio(d.priceToBook)} />
      <MetricCard label="Market Cap" value={d.marketCapFormatted || fmt.large(d.marketCap)} subtitle={d.capCategory} />
    </div>
  )
}

function TabProfitability({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard label="Gross Margin" value={fmt.pct(d.grossMargin)} colorKey={d.grossMargin > 0.4 ? 'positive' : null} />
      <MetricCard label="Operating Margin" value={fmt.pct(d.operatingMargin)} colorKey={signColor(d.operatingMargin)} />
      <MetricCard label="Net Margin" value={fmt.pct(d.netMargin)} colorKey={signColor(d.netMargin)} />
      <MetricCard label="FCF Margin" value={d.fcfMargin != null ? fmt.pctRaw(d.fcfMargin) : 'N/A'} colorKey={signColor(d.fcfMargin)} />
      <MetricCard label="Free Cash Flow" value={d.freeCashflowFormatted || fmt.large(d.freeCashflow)} colorKey={signColor(d.freeCashflow)} />
      <MetricCard label="ROE" value={fmt.pct(d.returnOnEquity)} colorKey={signColor(d.returnOnEquity)} />
      <MetricCard label="ROA" value={fmt.pct(d.returnOnAssets)} colorKey={signColor(d.returnOnAssets)} />
    </div>
  )
}

function TabSentiment({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard
        label="דירוג אנליסטים"
        value={REC_LABEL[d.recommendationKey] || d.recommendationKey || 'N/A'}
        colorKey={REC_COLOR[d.recommendationKey]}
        subtitle={d.numberOfAnalystOpinions ? `${d.numberOfAnalystOpinions} אנליסטים` : null}
      />
      <MetricCard label="Price Target ממוצע" value={fmt.price(d.targetMeanPrice)} />
      <MetricCard label="Upside מ-Target" value={d.upsidePercent != null ? fmt.pctRaw(d.upsidePercent) : 'N/A'} colorKey={signColor(d.upsidePercent)} />
      <MetricCard label="Price Target High" value={fmt.price(d.targetHighPrice)} />
      <MetricCard label="Price Target Low" value={fmt.price(d.targetLowPrice)} />
      <MetricCard label="Short Interest %" value={fmt.pct(d.shortPercentOfFloat)} colorKey={shortColor(d.shortPercentOfFloat)} />
      <MetricCard label="Institutional Holdings %" value={fmt.pct(d.heldPercentInstitutions)} />
      <MetricCard label="Insider Holdings %" value={fmt.pct(d.heldPercentInsiders)} />
    </div>
  )
}

function TabSector({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard label="סקטור" value={d.sector} />
      <MetricCard label="ענף" value={d.industry} />
      <MetricCard label="ביצועי המניה YTD" value={d.stockYTD != null ? fmt.pctRaw(d.stockYTD) : 'N/A'} colorKey={signColor(d.stockYTD)} />
      <MetricCard label="ביצועי S&P 500 YTD" value={d.spyYTD != null ? fmt.pctRaw(d.spyYTD) : 'N/A'} colorKey={signColor(d.spyYTD)} />
      <MetricCard label="Alpha vs S&P 500" value={d.alpha != null ? fmt.pctRaw(d.alpha) : 'N/A'} colorKey={signColor(d.alpha)} />
      <MetricCard label="Market Cap" value={d.marketCapFormatted || fmt.large(d.marketCap)} subtitle={d.capCategory} />
    </div>
  )
}

function TabSummary({ ticker }) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/stock/${ticker}/summary`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'שגיאה לא ידועה')
      }
      const json = await res.json()
      setSummary(json.summary)
    } catch (e) {
      setError(e.message || 'לא ניתן לייצר סיכום כרגע, נסה שוב')
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="summary-loading">
        <div className="spinner" />
        <p>מייצר סיכום AI...</p>
      </div>
    )
  }

  if (summary) {
    return (
      <div className="summary-content">
        {summary.split('\n\n').filter(Boolean).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        <button className="btn-secondary" onClick={() => { setSummary(null); setError(null) }}>
          צור סיכום חדש
        </button>
      </div>
    )
  }

  return (
    <div className="summary-cta">
      <p className="summary-hint">הסיכום נוצר על ידי Claude AI ומתבסס על כל הנתונים הפונדמנטליים של המניה.</p>
      <button className="btn-summary" onClick={generate}>✦ צור סיכום AI</button>
      {error && <p className="summary-error">{error}</p>}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

const TABS = ['דוחות', 'שווי', 'רווחיות', 'סנטימנט', 'סקטור', 'סיכום AI']

export default function App() {
  const [input, setInput] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(0)

  async function search() {
    const t = input.trim().toUpperCase()
    if (!t) return
    setLoading(true)
    setError(null)
    setData(null)
    setTab(0)
    try {
      const res = await fetch(`/api/stock/${t}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'שגיאה בטעינת נתונים')
      }
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const chg = data?.regularMarketChangePercent
  const chgColor = chg > 0 ? '#0F6E56' : chg < 0 ? '#993C1D' : '#374151'
  const chgStr = chg != null ? `${chg > 0 ? '+' : ''}${chg.toFixed(2)}%` : ''

  return (
    <div className="app" dir="rtl">
      <header className="app-header">
        <div className="header-inner">
          <span className="app-title">ניתוח פונדמנטלי מניות</span>
          <div className="search-row">
            <input
              className="ticker-input"
              placeholder="הכנס טיקר (לדוגמה: NVDA)"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
            <button className="btn-search" onClick={search} disabled={loading}>
              {loading ? 'טוען...' : 'נתח מניה'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}

        {!data && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>הכנס טיקר של מניה אמריקאית ולחץ על "נתח מניה"</p>
            <p className="empty-examples">לדוגמה: NVDA · AAPL · MSFT · TSLA</p>
          </div>
        )}

        {data && (
          <>
            <div className="company-header">
              <div className="company-info">
                <span className="ticker-badge" style={COLORS.ticker}>{data.ticker}</span>
                <h2 className="company-name">{data.shortName}</h2>
                <span className="company-meta">{[data.sector, data.industry].filter(Boolean).join(' · ')}</span>
              </div>
              <div className="price-block">
                <span className="current-price">{fmt.price(data.currentPrice)}</span>
                {chgStr && <span className="price-change" style={{ color: chgColor }}>{chgStr}</span>}
              </div>
            </div>

            <div className="quick-stats-row">
              <QuickStat label="צמיחת הכנסות YoY" value={fmt.pct(data.revenueGrowth)} colorKey={signColor(data.revenueGrowth)} />
              <QuickStat label="צמיחת EPS YoY" value={fmt.pct(data.earningsGrowth)} colorKey={signColor(data.earningsGrowth)} />
              <QuickStat label="Short Interest" value={fmt.pct(data.shortPercentOfFloat)} colorKey={shortColor(data.shortPercentOfFloat)} />
              <QuickStat
                label="דירוג אנליסטים"
                value={REC_LABEL[data.recommendationKey] || data.recommendationKey || 'N/A'}
                colorKey={REC_COLOR[data.recommendationKey]}
              />
            </div>

            <div className="tab-nav">
              {TABS.map((t, i) => (
                <button
                  key={i}
                  className={`tab-btn${tab === i ? ' active' : ''}`}
                  onClick={() => setTab(i)}
                >{t}</button>
              ))}
            </div>

            <div className="tab-body">
              {tab === 0 && <TabReports d={data} />}
              {tab === 1 && <TabValuation d={data} />}
              {tab === 2 && <TabProfitability d={data} />}
              {tab === 3 && <TabSentiment d={data} />}
              {tab === 4 && <TabSector d={data} />}
              {tab === 5 && <TabSummary ticker={data.ticker} />}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
