import { useState } from 'react'
import './App.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = {
  pct:    (v, d=1) => v == null ? 'N/A' : `${(v*100).toFixed(d)}%`,
  pctRaw: (v, d=1) => v == null ? 'N/A' : `${v.toFixed(d)}%`,
  price:  (v)     => v == null ? 'N/A' : `$${v.toFixed(2)}`,
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

const COLORS = {
  positive: { background: 'var(--pos-bg)', color: 'var(--pos-fg)', borderColor: '#1a4a34' },
  negative: { background: 'var(--neg-bg)', color: 'var(--neg-fg)', borderColor: '#5a1a1a' },
  warning:  { background: 'var(--warn-bg)', color: 'var(--warn-fg)', borderColor: '#4a3a10' },
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

// ── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({ label, value, colorKey, subtitle, hint }) {
  return (
    <div className="metric-card" style={colorKey ? COLORS[colorKey] : {}}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value ?? 'N/A'}</div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
      {hint    && <div className="metric-hint">{hint}</div>}
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

// ── Tab: Reports ──────────────────────────────────────────────────────────────

function TabReports({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard
        label="צמיחת הכנסות YoY" value={fmt.pct(d.revenueGrowth)}
        colorKey={signColor(d.revenueGrowth)}
        hint="האם החברה גדלה? מעל 15% — צמיחה טובה. מתחת ל-0% — ירידה בעסק" />
      <MetricCard
        label="צמיחת רווח EPS YoY" value={fmt.pct(d.earningsGrowth)}
        colorKey={signColor(d.earningsGrowth)}
        hint="רווח למניה — מנוע מרכזי לעליית מחיר. צמיחה מהירה מהכנסות = יעילות עולה" />
      <MetricCard
        label="Gross Margin" value={fmt.pct(d.grossMargin)}
        hint="מה נשאר מכל שקל מכירות לפני הוצאות תפעול. SaaS: 70%+ · תעשייה: 30-50%" />
      <MetricCard
        label="הכנסות TTM" value={d.revenueTTMFormatted || fmt.large(d.revenueTTM)}
        hint="סך הכנסות ב-12 החודשים האחרונים — מראה גודל עסק בפועל" />
      <MetricCard
        label="רווח נקי TTM" value={d.netIncomeTTMFormatted || fmt.large(d.netIncomeTTM)}
        colorKey={signColor(d.netIncomeTTM)}
        hint="שורה תחתונה: מה נשאר לחברה אחרי הכל. שלילי = עדיין מפסידה" />
      <MetricCard
        label="Free Cash Flow" value={d.freeCashflowFormatted || fmt.large(d.freeCashflow)}
        colorKey={signColor(d.freeCashflow)}
        hint="כסף אמיתי שנכנס לקופה — לעיתים אמין יותר מרווח חשבונאי" />
      <MetricCard
        label="רבעון אחרון שדווח" value={d.mostRecentQuarter}
        hint="מתי פורסם הדוח הרבעוני האחרון — בדוק שהנתונים עדכניים" />
      <MetricCard
        label="דוח הבא (קירוב)" value={d.nextEarningsApprox}
        hint="תאריך הדוח הבא — אירוע תנודתי מאוד. היזהר מכניסה לפניו" />
    </div>
  )
}

// ── Tab: Valuation ────────────────────────────────────────────────────────────

function TabValuation({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard
        label="P/E Trailing" value={fmt.ratio(d.trailingPE)}
        hint="מחיר חלקי רווח שנתי שהיה. ממוצע S&P: ~20. גבוה מדי = יקר" />
      <MetricCard
        label="P/E Forward" value={fmt.ratio(d.forwardPE)}
        hint="מחיר חלקי רווח צפוי. נמוך מה-Trailing = צפי לשיפור ברווחיות" />
      <MetricCard
        label="P/S" value={fmt.ratio(d.priceToSales)}
        hint="מחיר חלקי מכירות — שימושי כשאין רווח. מתחת ל-5 נחשב סביר" />
      <MetricCard
        label="EV/EBITDA" value={fmt.ratio(d.evToEbitda)}
        hint="שווי פירמה מלא חלקי רווח תפעולי. מתחת ל-15 — שווי הוגן" />
      <MetricCard
        label="PEG Ratio" value={fmt.ratio(d.pegRatio)}
        colorKey={pegColor(d.pegRatio)}
        hint="P/E חלקי צמיחה. מתחת ל-1 = זול ביחס לצמיחה. מעל 2 = יקר" />
      <MetricCard
        label="Market Cap" value={d.marketCapFormatted || fmt.large(d.marketCap)}
        subtitle={d.capCategory}
        hint="שווי שוק כולל: Large +10B · Mid 2-10B · Small מתחת ל-2B" />
    </div>
  )
}

// ── Tab: Profitability ────────────────────────────────────────────────────────

function TabProfitability({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard
        label="Operating Margin" value={fmt.pct(d.operatingMargin)}
        colorKey={signColor(d.operatingMargin)}
        hint="כמה נשאר אחרי כל הוצאות תפעול. מעל 15% — עסק יעיל ומנוהל טוב" />
      <MetricCard
        label="Net Margin" value={fmt.pct(d.netMargin)}
        colorKey={signColor(d.netMargin)}
        hint="הרווח הסופי מכל שקל מכירות — אחרי מיסים, ריבית והכל" />
      <MetricCard
        label="FCF Margin" value={d.fcfMargin != null ? fmt.pctRaw(d.fcfMargin) : 'N/A'}
        colorKey={signColor(d.fcfMargin)}
        hint="כמה מהמכירות הופך לכסף נזיל. מעל 10% — חברה ייצרנית מזומנים" />
      <MetricCard
        label="ROE" value={fmt.pct(d.returnOnEquity)}
        colorKey={signColor(d.returnOnEquity)}
        hint="תשואה על ההון שבעלי המניות השקיעו. מעל 15% = ניהול מצוין" />
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
        hint="קונצנזוס אנליסטים — ככל שיש יותר אנליסטים, הדירוג אמין יותר" />
      <MetricCard
        label="Price Target ממוצע" value={fmt.price(d.targetMeanPrice)}
        hint="מחיר יעד ממוצע ל-12 חודשים. עדיף להסתכל על Upside %" />
      <MetricCard
        label="Upside מ-Target" value={d.upsidePercent != null ? fmt.pctRaw(d.upsidePercent) : 'N/A'}
        colorKey={signColor(d.upsidePercent)}
        hint="פוטנציאל עלייה לפי אנליסטים. מעל 15% = יש מקום לעלייה" />
      <MetricCard
        label="Price Target High" value={fmt.price(d.targetHighPrice)}
        hint="תחזית האופטימית ביותר — תרחיש שורי. מסגרת עליון לפוטנציאל" />
      <MetricCard
        label="Price Target Low" value={fmt.price(d.targetLowPrice)}
        hint="תחזית הפסימית ביותר — תרחיש דובי. מסגרת תחתון לסיכון" />
      <MetricCard
        label="Short Interest %" value={fmt.pct(d.shortPercentOfFloat)}
        colorKey={shortColor(d.shortPercentOfFloat)}
        hint="% מניות בשורט: מתחת ל-5% = תקין · 5-15% = זהירות · מעל 15% = לחץ מכירה" />
      <MetricCard
        label="Institutional Holdings" value={fmt.pct(d.heldPercentInstitutions)}
        hint="% שמוחזק על ידי קרנות גדולות. מעל 60% = אמון מוסדי גבוה" />
      <MetricCard
        label="Insider Holdings" value={fmt.pct(d.heldPercentInsiders)}
        hint="% שמוחזק על ידי ההנהלה. גבוה = המנהלים מאמינים בחברה שלהם" />
    </div>
  )
}

// ── Tab: Sector ───────────────────────────────────────────────────────────────

function TabSector({ d }) {
  return (
    <div className="tab-grid">
      <MetricCard
        label="סקטור" value={d.sector}
        hint="הסקטור הכלכלי — חשוב לבדוק האם הסקטור כולו בעלייה או ירידה" />
      <MetricCard
        label="ענף" value={d.industry}
        hint="הענף הספציפי — השווה למניות דומות באותו ענף" />
      <MetricCard
        label="ביצועי המניה YTD" value={d.stockYTD != null ? fmt.pctRaw(d.stockYTD) : 'N/A'}
        colorKey={signColor(d.stockYTD)}
        hint="ביצועי המניה מ-1 בינואר עד היום — האם החברה חזקה השנה?" />
      <MetricCard
        label="S&P 500 YTD" value={d.spyYTD != null ? fmt.pctRaw(d.spyYTD) : 'N/A'}
        colorKey={signColor(d.spyYTD)}
        hint="הביצועים של השוק הכללי השנה — ה-benchmark להשוואה" />
      <MetricCard
        label="Alpha vs S&P 500" value={d.alpha != null ? fmt.pctRaw(d.alpha) : 'N/A'}
        colorKey={signColor(d.alpha)}
        hint="עודף ביצועים מול השוק. חיובי = ביצוע עדיף. זה מה שחשוב לסוחר" />
      <MetricCard
        label="Market Cap" value={d.marketCapFormatted || fmt.large(d.marketCap)}
        subtitle={d.capCategory}
        hint="Large Cap יציב יותר · Small Cap תנודתי יותר עם פוטנציאל גבוה" />
    </div>
  )
}

// ── Tab: About ────────────────────────────────────────────────────────────────

function TabAbout({ d }) {
  const employees = d.fullTimeEmployees
    ? d.fullTimeEmployees.toLocaleString() + ' עובדים'
    : null

  return (
    <div className="about-tab">
      <div className="about-header">
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
      </div>

      {d.longBusinessSummary ? (
        <div className="about-summary">
          <h3 className="about-summary-title">על החברה</h3>
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
  const [error, setError] = useState(null)

  async function generate() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/stock/${ticker}/summary`, { method: 'POST' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'שגיאה') }
      const j = await res.json()
      setSummary(j.summary)
    } catch(e) { setError(e.message || 'לא ניתן לייצר סיכום כרגע, נסה שוב') }
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
      <p className="summary-hint">הסיכום נוצר על ידי Claude AI ומתבסס על כל הנתונים הפונדמנטליים של המניה.</p>
      <button className="btn-summary" onClick={generate}>✦ צור סיכום AI</button>
      {error && <p className="summary-error">{error}</p>}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

const TABS = ['דוחות', 'שווי', 'רווחיות', 'סנטימנט', 'סקטור', 'על החברה', 'סיכום AI']

export default function App() {
  const [input, setInput]   = useState('')
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [tab, setTab]       = useState(0)

  async function search() {
    const t = input.trim().toUpperCase()
    if (!t) return
    setLoading(true); setError(null); setData(null); setTab(0)
    try {
      const res = await fetch(`/api/stock/${t}`)
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'שגיאה') }
      setData(await res.json())
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  const chg = data?.regularMarketChangePercent
  const chgColor = chg > 0 ? 'var(--pos-fg)' : chg < 0 ? 'var(--neg-fg)' : 'var(--text-2)'
  const chgStr   = chg != null ? `${chg > 0 ? '+' : ''}${chg.toFixed(2)}%` : ''

  return (
    <div className="app" dir="rtl">
      <header className="app-header">
        <div className="header-inner">
          <span className="app-title">ניתוח פונדמנטלי מניות</span>
          <div className="search-row">
            <input
              className="ticker-input"
              placeholder="הכנס טיקר (NVDA, AAPL...)"
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
            <p className="empty-examples">NVDA · AAPL · MSFT · TSLA · AMZN</p>
          </div>
        )}

        {data && (
          <>
            <div className="company-header">
              <div className="company-info">
                <span className="ticker-badge">{data.ticker}</span>
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
              <QuickStat label="צמיחת EPS YoY"    value={fmt.pct(data.earningsGrowth)} colorKey={signColor(data.earningsGrowth)} />
              <QuickStat label="Short Interest"   value={fmt.pct(data.shortPercentOfFloat)} colorKey={shortColor(data.shortPercentOfFloat)} />
              <QuickStat
                label="דירוג אנליסטים"
                value={REC_LABEL[data.recommendationKey] || data.recommendationKey || 'N/A'}
                colorKey={REC_COLOR[data.recommendationKey]}
              />
            </div>

            <div className="tab-nav">
              {TABS.map((t, i) => (
                <button key={i} className={`tab-btn${tab===i?' active':''}`} onClick={() => setTab(i)}>{t}</button>
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
