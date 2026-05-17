import { useState } from 'react'
import './App.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = {
  pct:    (v, d=1) => v == null ? 'N/A' : `${(v*100).toFixed(d)}%`,
  pctRaw: (v, d=1) => v == null ? 'N/A' : `${v.toFixed(d)}%`,
  price:  (v)      => v == null ? 'N/A' : `$${v.toFixed(2)}`,
  ratio:  (v, d=2) => v == null ? 'N/A' : v.toFixed(d),
  large:  (v) => {
    if (v == null) return 'N/A'
    const s = v < 0 ? '-' : '', a = Math.abs(v)
    if (a >= 1e12) return `${s}$${(a/1e12).toFixed(2)}T`
    if (a >= 1e9)  return `${s}$${(a/1e9).toFixed(2)}B`
    if (a >= 1e6)  return `${s}$${(a/1e6).toFixed(2)}M`
    return `${s}$${a.toLocaleString()}`
  },
}

function signColor(v)  { return v == null ? null : v > 0 ? 'positive' : 'negative' }
function shortColor(v) {
  if (v == null) return null
  const p = v*100
  return p < 5 ? 'positive' : p <= 15 ? 'warning' : 'negative'
}
function pegColor(v) {
  if (v == null) return null
  return v < 1 ? 'positive' : v <= 2 ? 'warning' : 'negative'
}

const REC_LABEL = { strong_buy:'קנייה חזקה', buy:'קנייה', hold:'החזקה', sell:'מכירה', underperform:'ביצוע חסר' }
const REC_COLOR = { strong_buy:'positive', buy:'positive', hold:'warning', sell:'negative', underperform:'negative' }

// ── Visualization Components ──────────────────────────────────────────────────

// Progress bar: pct 0-100
function ProgressBar({ value, max = 100, color = 'var(--accent)', label }) {
  const clipped = Math.min(Math.max(value ?? 0, 0), max)
  const pct = (clipped / max) * 100
  return (
    <div className="pbar-wrap">
      <div className="pbar-track">
        <div className="pbar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {label && <div className="pbar-label"><span>{label}</span><span>{max}%</span></div>}
    </div>
  )
}

// Zone bar: e.g. PEG (<1 green | 1-2 yellow | >2 red)
function ZoneBar({ value, zones }) {
  // zones: [{max, color, label}]
  const active = zones.findIndex((z, i) => {
    const prev = i === 0 ? 0 : zones[i - 1].max
    return value >= prev && (i === zones.length - 1 || value < z.max)
  })
  return (
    <div className="zonebar-wrap">
      <div className="zonebar-track">
        {zones.map((z, i) => (
          <div
            key={i}
            className={`zonebar-seg${active === i ? ' active' : ''}`}
            style={{ background: z.color }}
          />
        ))}
      </div>
      <div className="zonebar-labels">
        {zones.map((z, i) => <span key={i}>{z.label}</span>)}
      </div>
    </div>
  )
}

// Dual bar: positive right, negative left from center
function DualBar({ value, max = 50 }) {
  if (value == null) return null
  const isPos = value >= 0
  const pct = Math.min(Math.abs(value) / max * 50, 50)
  return (
    <div className="dualbar-wrap">
      <div className="dualbar-track">
        <div className="dualbar-center" />
        <div className="dualbar-fill" style={{
          width: `${pct}%`,
          left: isPos ? '50%' : `${50 - pct}%`,
          background: isPos ? 'var(--pos-fg)' : 'var(--neg-fg)',
        }} />
      </div>
    </div>
  )
}

// ── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({ label, value, colorKey, subtitle, hint, children }) {
  return (
    <div className={`metric-card${colorKey ? ` col-${colorKey}` : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value ?? 'N/A'}</div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
      {children}
      {hint && <div className="metric-hint">{hint}</div>}
    </div>
  )
}

function QuickStat({ label, value, colorKey }) {
  const colorMap = {
    positive: 'var(--pos-fg)',
    negative: 'var(--neg-fg)',
    warning:  'var(--warn-fg)',
  }
  return (
    <div className="quick-stat">
      <div className="qs-label">{label}</div>
      <div className="qs-value" style={{ color: colorKey ? colorMap[colorKey] : 'var(--text-1)' }}>
        {value ?? 'N/A'}
      </div>
    </div>
  )
}

// ── Tab: Reports ──────────────────────────────────────────────────────────────

function TabReports({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard label="צמיחת הכנסות YoY" value={fmt.pct(d.revenueGrowth)} colorKey={signColor(d.revenueGrowth)}
        hint="מעל 15% — צמיחה טובה. מתחת ל-0% — הכנסות בירידה">
        {d.revenueGrowth != null && (
          <ProgressBar
            value={Math.max(d.revenueGrowth * 100, 0)} max={50}
            color={d.revenueGrowth >= 0 ? 'var(--pos-fg)' : 'var(--neg-fg)'}
          />
        )}
      </MetricCard>
      <MetricCard label="צמיחת EPS YoY" value={fmt.pct(d.earningsGrowth)} colorKey={signColor(d.earningsGrowth)}
        hint="מנוע מרכזי לעליית מחיר. צמיחה מהירה מהכנסות = יעילות עולה">
        {d.earningsGrowth != null && (
          <ProgressBar
            value={Math.max(d.earningsGrowth * 100, 0)} max={60}
            color={d.earningsGrowth >= 0 ? 'var(--pos-fg)' : 'var(--neg-fg)'}
          />
        )}
      </MetricCard>
      <MetricCard label="Gross Margin" value={fmt.pct(d.grossMargin)}
        hint="SaaS: 70%+ · תעשייה: 30-50% · מתחת ל-20% = שולי רווח דחוקים">
        {d.grossMargin != null && (
          <ProgressBar value={d.grossMargin * 100} max={100} color="var(--accent2)" />
        )}
      </MetricCard>
      <MetricCard label="הכנסות TTM" value={d.revenueTTMFormatted || fmt.large(d.revenueTTM)}
        hint="סך הכנסות ב-12 החודשים האחרונים — מראה גודל עסק בפועל" />
      <MetricCard label="רווח נקי TTM" value={d.netIncomeTTMFormatted || fmt.large(d.netIncomeTTM)}
        colorKey={signColor(d.netIncomeTTM)}
        hint="שורה תחתונה. שלילי = עדיין מפסידה" />
      <MetricCard label="Free Cash Flow" value={d.freeCashflowFormatted || fmt.large(d.freeCashflow)}
        colorKey={signColor(d.freeCashflow)}
        hint="כסף אמיתי שנכנס לקופה — לעיתים אמין יותר מרווח חשבונאי" />
      <MetricCard label="רבעון אחרון" value={d.mostRecentQuarter}
        hint="בדוק שהנתונים עדכניים — ישן מ-6 חודשים = פחות אמין" />
      <MetricCard label="דוח הבא (קירוב)" value={d.nextEarningsApprox}
        hint="אירוע תנודתי מאוד — שקול לא להיכנס לפניו" />
    </div>
  )
}

// ── Tab: Valuation ────────────────────────────────────────────────────────────

function TabValuation({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard label="P/E Trailing" value={fmt.ratio(d.trailingPE)}
        hint="ממוצע S&P: ~20. גבוה מדי = הציפיות כבר במחיר" />
      <MetricCard label="P/E Forward" value={fmt.ratio(d.forwardPE)}
        hint="נמוך מה-Trailing = צפי לשיפור ברווחיות" />
      <MetricCard label="P/S" value={fmt.ratio(d.priceToSales)}
        hint="מתחת ל-5 — סביר. שימושי כשאין רווח עדיין" />
      <MetricCard label="EV/EBITDA" value={fmt.ratio(d.evToEbitda)}
        hint="מתחת ל-15 — שווי הוגן. המדד הכי נקי להשוואה">
        {d.evToEbitda != null && (
          <ZoneBar value={d.evToEbitda} zones={[
            { max: 15,  color: 'var(--pos-fg)', label: '<15' },
            { max: 25,  color: 'var(--warn-fg)', label: '15-25' },
            { max: 999, color: 'var(--neg-fg)', label: '25+' },
          ]} />
        )}
      </MetricCard>
      <MetricCard label="PEG Ratio" value={fmt.ratio(d.pegRatio)} colorKey={pegColor(d.pegRatio)}
        hint="מתחת ל-1 = זול ביחס לצמיחה. מעל 2 = יקר">
        {d.pegRatio != null && (
          <ZoneBar value={d.pegRatio} zones={[
            { max: 1,   color: 'var(--pos-fg)', label: '<1' },
            { max: 2,   color: 'var(--warn-fg)', label: '1-2' },
            { max: 999, color: 'var(--neg-fg)', label: '>2' },
          ]} />
        )}
      </MetricCard>
      <MetricCard label="Market Cap" value={d.marketCapFormatted || fmt.large(d.marketCap)}
        subtitle={d.capCategory}
        hint="Large +10B · Mid 2-10B · Small מתחת ל-2B" />
    </div>
  )
}

// ── Tab: Profitability ────────────────────────────────────────────────────────

function TabProfitability({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard label="Operating Margin" value={fmt.pct(d.operatingMargin)} colorKey={signColor(d.operatingMargin)}
        hint="מעל 15% — עסק יעיל. מעל 25% — עסק יוצא דופן">
        {d.operatingMargin != null && (
          <ProgressBar
            value={Math.max(d.operatingMargin * 100, 0)} max={50}
            color={d.operatingMargin >= 0 ? 'var(--pos-fg)' : 'var(--neg-fg)'}
          />
        )}
      </MetricCard>
      <MetricCard label="Net Margin" value={fmt.pct(d.netMargin)} colorKey={signColor(d.netMargin)}
        hint="הרווח הסופי מכל שקל מכירות, אחרי מיסים וריבית">
        {d.netMargin != null && (
          <ProgressBar
            value={Math.max(d.netMargin * 100, 0)} max={40}
            color={d.netMargin >= 0 ? 'var(--pos-fg)' : 'var(--neg-fg)'}
          />
        )}
      </MetricCard>
      <MetricCard label="FCF Margin" value={d.fcfMargin != null ? fmt.pctRaw(d.fcfMargin) : 'N/A'}
        colorKey={signColor(d.fcfMargin)}
        hint="מעל 10% — ייצרנית מזומנים. זה מה שמממן צמיחה">
        {d.fcfMargin != null && (
          <ProgressBar
            value={Math.max(d.fcfMargin, 0)} max={40}
            color={d.fcfMargin >= 0 ? 'var(--accent)' : 'var(--neg-fg)'}
          />
        )}
      </MetricCard>
      <MetricCard label="ROE" value={fmt.pct(d.returnOnEquity)} colorKey={signColor(d.returnOnEquity)}
        hint="מעל 15% = ניהול מצוין. מעל 30% = עסק ברמה גבוהה">
        {d.returnOnEquity != null && (
          <ProgressBar
            value={Math.max(d.returnOnEquity * 100, 0)} max={50}
            color={d.returnOnEquity >= 0 ? 'var(--pos-fg)' : 'var(--neg-fg)'}
          />
        )}
      </MetricCard>
    </div>
  )
}

// ── Tab: Sentiment ────────────────────────────────────────────────────────────

function TabSentiment({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard
        label="דירוג אנליסטים"
        value={REC_LABEL[d.recommendationKey] || d.recommendationKey || 'N/A'}
        colorKey={REC_COLOR[d.recommendationKey]}
        subtitle={d.numberOfAnalystOpinions ? `${d.numberOfAnalystOpinions} אנליסטים` : null}
        hint="ככל שיש יותר אנליסטים, הדירוג אמין יותר" />
      <MetricCard label="Price Target ממוצע" value={fmt.price(d.targetMeanPrice)}
        hint="מחיר יעד ממוצע ל-12 חודשים. הסתכל על Upside %" />
      <MetricCard label="Upside מ-Target" value={d.upsidePercent != null ? fmt.pctRaw(d.upsidePercent) : 'N/A'}
        colorKey={signColor(d.upsidePercent)}
        hint="מעל 15% = יש מקום לעלייה לפי אנליסטים">
        <DualBar value={d.upsidePercent} max={60} />
      </MetricCard>
      <MetricCard label="Target High" value={fmt.price(d.targetHighPrice)}
        hint="תרחיש אופטימי — מסגרת עליון לפוטנציאל" />
      <MetricCard label="Target Low" value={fmt.price(d.targetLowPrice)}
        hint="תרחיש פסימי — מסגרת תחתון לסיכון" />
      <MetricCard label="Short Interest %" value={fmt.pct(d.shortPercentOfFloat)}
        colorKey={shortColor(d.shortPercentOfFloat)}
        hint="מתחת ל-5% תקין · 5-15% זהירות · מעל 15% לחץ מכירה">
        {d.shortPercentOfFloat != null && (
          <ZoneBar value={d.shortPercentOfFloat * 100} zones={[
            { max: 5,   color: 'var(--pos-fg)', label: '<5%' },
            { max: 15,  color: 'var(--warn-fg)', label: '5-15%' },
            { max: 100, color: 'var(--neg-fg)', label: '>15%' },
          ]} />
        )}
      </MetricCard>
      <MetricCard label="Institutional %" value={fmt.pct(d.heldPercentInstitutions)}
        hint="מעל 60% = אמון מוסדי גבוה">
        {d.heldPercentInstitutions != null && (
          <ProgressBar value={d.heldPercentInstitutions * 100} max={100} color="var(--accent2)" />
        )}
      </MetricCard>
      <MetricCard label="Insider %" value={fmt.pct(d.heldPercentInsiders)}
        hint="גבוה = המנהלים מאמינים בחברה שלהם">
        {d.heldPercentInsiders != null && (
          <ProgressBar value={d.heldPercentInsiders * 100} max={100} color="var(--accent2)" />
        )}
      </MetricCard>
    </div>
  )
}

// ── Tab: Sector ───────────────────────────────────────────────────────────────

function TabSector({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard label="סקטור" value={d.sector}
        hint="בדוק האם הסקטור כולו בעלייה או ירידה לפני כניסה" />
      <MetricCard label="ענף" value={d.industry}
        hint="השווה למניות דומות באותו ענף" />
      <MetricCard label="ביצועי המניה YTD" value={d.stockYTD != null ? fmt.pctRaw(d.stockYTD) : 'N/A'}
        colorKey={signColor(d.stockYTD)}
        hint="האם החברה חזקה השנה?">
        <DualBar value={d.stockYTD} max={80} />
      </MetricCard>
      <MetricCard label="S&P 500 YTD" value={d.spyYTD != null ? fmt.pctRaw(d.spyYTD) : 'N/A'}
        colorKey={signColor(d.spyYTD)}
        hint="ביצועי השוק הכללי — ה-benchmark">
        <DualBar value={d.spyYTD} max={80} />
      </MetricCard>
      <MetricCard label="Alpha vs S&P 500" value={d.alpha != null ? fmt.pctRaw(d.alpha) : 'N/A'}
        colorKey={signColor(d.alpha)}
        hint="חיובי = ביצוע עדיף על השוק. זה מה שחשוב לסוחר">
        <DualBar value={d.alpha} max={50} />
      </MetricCard>
    </div>
  )
}

// ── Tab: About ────────────────────────────────────────────────────────────────

function TabAbout({ d }) {
  const employees = d.fullTimeEmployees ? d.fullTimeEmployees.toLocaleString() + ' עובדים' : null
  return (
    <div className="about-tab">
      <div className="about-meta">
        {[d.longName || d.shortName, d.sector, d.industry].filter(Boolean).map((item, i) => (
          <span key={i} className="about-tag">{item}</span>
        ))}
        {d.country && <span className="about-tag">📍 {[d.city, d.country].filter(Boolean).join(', ')}</span>}
        {employees  && <span className="about-tag">👥 {employees}</span>}
        {d.website  && (
          <a href={d.website} target="_blank" rel="noreferrer" className="about-tag about-link">
            🌐 {d.website.replace(/^https?:\/\//, '')}
          </a>
        )}
      </div>
      {d.longBusinessSummary ? (
        <div>
          <div className="about-summary-title">על החברה</div>
          <p className="about-summary-text">{d.longBusinessSummary}</p>
        </div>
      ) : (
        <p className="about-empty">אין תיאור זמין עבור מניה זו.</p>
      )}
    </div>
  )
}

// ── Tab: Summary ──────────────────────────────────────────────────────────────

function TabSummary({ ticker }) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [error, setError]     = useState(null)

  async function generate() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/stock/${ticker}/summary`, { method: 'POST' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'שגיאה') }
      setSummary((await res.json()).summary)
    } catch (e) { setError(e.message || 'לא ניתן לייצר סיכום כרגע') }
    setLoading(false)
  }

  if (loading) return (
    <div className="summary-loading">
      <div className="spinner" />
      <p>מייצר סיכום AI...</p>
    </div>
  )

  if (summary) return (
    <div className="summary-content">
      {summary.split('\n\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      <button className="btn-secondary" onClick={() => { setSummary(null); setError(null) }}>צור סיכום חדש</button>
    </div>
  )

  return (
    <div className="summary-cta">
      <p className="summary-hint">הסיכום נוצר על ידי Claude AI ומתבסס על כל הנתונים הפונדמנטליים.</p>
      <button className="btn-summary" onClick={generate}>✦ GENERATE AI SUMMARY</button>
      {error && <p className="summary-error">{error}</p>}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

const TABS = ['דוחות', 'שווי', 'רווחיות', 'סנטימנט', 'סקטור', 'על החברה', 'סיכום AI']

export default function App() {
  const [input, setInput]     = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [tab, setTab]         = useState(0)

  async function search() {
    const t = input.trim().toUpperCase()
    if (!t) return
    setLoading(true); setError(null); setData(null); setTab(0)
    try {
      const res = await fetch(`/api/stock/${t}`)
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'שגיאה') }
      setData(await res.json())
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const chg = data?.regularMarketChangePercent
  const chgColor = chg > 0 ? 'var(--pos-fg)' : chg < 0 ? 'var(--neg-fg)' : 'var(--text-2)'
  const chgStr   = chg != null ? `${chg > 0 ? '+' : ''}${chg.toFixed(2)}%` : ''

  return (
    <div className="app" dir="rtl">
      <header className="app-header">
        <div className="header-inner">
          <span className="app-title">Stock Analyzer</span>
          <div className="search-row">
            <input
              className="ticker-input"
              placeholder="TICKER"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
            <button className="btn-search" onClick={search} disabled={loading}>
              {loading ? '...' : 'ANALYZE'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {error && <div className="error-banner">⚠ {error}</div>}

        {!data && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">▣</div>
            <p>הכנס טיקר של מניה אמריקאית</p>
            <p className="empty-examples">NVDA · AAPL · MSFT · TSLA · AMZN</p>
          </div>
        )}

        {data && (
          <>
            <div className="company-header">
              <div className="company-info">
                <span className="ticker-badge">{data.ticker}</span>
                <h2 className="company-name">{data.shortName}</h2>
                <span className="company-meta">{[data.sector, data.industry].filter(Boolean).join(' / ')}</span>
              </div>
              <div className="price-block">
                <span className="current-price">{fmt.price(data.currentPrice)}</span>
                {chgStr && <span className="price-change" style={{ color: chgColor }}>{chgStr}</span>}
              </div>
            </div>

            <div className="quick-stats-row">
              <QuickStat label="Revenue Growth YoY" value={fmt.pct(data.revenueGrowth)} colorKey={signColor(data.revenueGrowth)} />
              <QuickStat label="EPS Growth YoY"     value={fmt.pct(data.earningsGrowth)} colorKey={signColor(data.earningsGrowth)} />
              <QuickStat label="Short Interest"     value={fmt.pct(data.shortPercentOfFloat)} colorKey={shortColor(data.shortPercentOfFloat)} />
              <QuickStat
                label="Analyst Rating"
                value={REC_LABEL[data.recommendationKey] || data.recommendationKey || 'N/A'}
                colorKey={REC_COLOR[data.recommendationKey]}
              />
            </div>

            <div className="tab-nav">
              {TABS.map((t, i) => (
                <button key={i} className={`tab-btn${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>{t}</button>
              ))}
            </div>

            <div className="tab-body">
              {tab === 0 && <TabReports       d={data} />}
              {tab === 1 && <TabValuation     d={data} />}
              {tab === 2 && <TabProfitability d={data} />}
              {tab === 3 && <TabSentiment     d={data} />}
              {tab === 4 && <TabSector        d={data} />}
              {tab === 5 && <TabAbout         d={data} />}
              {tab === 6 && <TabSummary       ticker={data.ticker} />}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
