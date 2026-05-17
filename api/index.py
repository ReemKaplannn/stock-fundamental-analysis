from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
import yfinance as yf
import anthropic
import os
import time
import json
from dotenv import load_dotenv
from datetime import datetime, date

load_dotenv()

app = FastAPI()


def translate_to_hebrew(text: str) -> str:
    if not text:
        return None
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source="en", target="iw").translate(text[:4999])
    except Exception:
        return text  # fallback to English

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache: dict = {}
CACHE_TTL = 3600


def safe(info, key, default=None):
    v = info.get(key, default)
    return v if v is not None else default


def fmt_large(value):
    if value is None:
        return None
    v = abs(value)
    sign = "" if value >= 0 else "-"
    if v >= 1e12:
        return f"{sign}${v/1e12:.2f}T"
    if v >= 1e9:
        return f"{sign}${v/1e9:.2f}B"
    if v >= 1e6:
        return f"{sign}${v/1e6:.2f}M"
    return f"{sign}${v:,.0f}"


def ts_to_date(ts):
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(ts).strftime("%d/%m/%Y")
    except Exception:
        return None


def get_ytd(ticker_symbol: str):
    try:
        start = date(date.today().year, 1, 1).strftime("%Y-%m-%d")
        stock = yf.download(ticker_symbol, start=start, progress=False, auto_adjust=True)
        spy = yf.download("SPY", start=start, progress=False, auto_adjust=True)
        if len(stock) < 2 or len(spy) < 2:
            return None, None, None
        s_ytd = float((stock["Close"].iloc[-1] - stock["Close"].iloc[0]) / stock["Close"].iloc[0] * 100)
        spy_ytd = float((spy["Close"].iloc[-1] - spy["Close"].iloc[0]) / spy["Close"].iloc[0] * 100)
        return s_ytd, spy_ytd, s_ytd - spy_ytd
    except Exception:
        return None, None, None


def fetch_stock_data(ticker_symbol: str):
    tk = yf.Ticker(ticker_symbol)
    info = tk.info

    current_price = safe(info, "currentPrice") or safe(info, "regularMarketPrice")
    if not info or current_price is None:
        return None

    revenue_ttm = safe(info, "totalRevenue")
    net_income_ttm = safe(info, "netIncomeToCommon")

    if revenue_ttm is None or net_income_ttm is None:
        try:
            stmt = tk.income_stmt
            if stmt is not None and not stmt.empty:
                if revenue_ttm is None and "Total Revenue" in stmt.index:
                    revenue_ttm = float(stmt.loc["Total Revenue"].iloc[0])
                if net_income_ttm is None and "Net Income" in stmt.index:
                    net_income_ttm = float(stmt.loc["Net Income"].iloc[0])
        except Exception:
            pass

    fcf = safe(info, "freeCashflow")
    fcf_margin = (fcf / revenue_ttm * 100) if (fcf and revenue_ttm) else None

    target_mean = safe(info, "targetMeanPrice")
    upside = ((target_mean - current_price) / current_price * 100) if (target_mean and current_price) else None

    market_cap = safe(info, "marketCap")
    if market_cap:
        cap_category = "Large Cap" if market_cap >= 10e9 else ("Mid Cap" if market_cap >= 2e9 else "Small Cap")
    else:
        cap_category = None

    stock_ytd, spy_ytd, alpha = get_ytd(ticker_symbol)

    return {
        "ticker": ticker_symbol.upper(),
        "shortName": safe(info, "shortName"),
        "longName": safe(info, "longName"),
        "sector": safe(info, "sector"),
        "industry": safe(info, "industry"),
        "country": safe(info, "country"),
        "city": safe(info, "city"),
        "website": safe(info, "website"),
        "fullTimeEmployees": safe(info, "fullTimeEmployees"),
        "longBusinessSummary": translate_to_hebrew(safe(info, "longBusinessSummary")),
        "currentPrice": current_price,
        "regularMarketChangePercent": safe(info, "regularMarketChangePercent"),
        "revenueGrowth": safe(info, "revenueGrowth"),
        "earningsGrowth": safe(info, "earningsGrowth"),
        "grossMargin": safe(info, "grossMargins"),
        "revenueTTM": revenue_ttm,
        "revenueTTMFormatted": fmt_large(revenue_ttm),
        "netIncomeTTM": net_income_ttm,
        "netIncomeTTMFormatted": fmt_large(net_income_ttm),
        "freeCashflow": fcf,
        "freeCashflowFormatted": fmt_large(fcf),
        "mostRecentQuarter": ts_to_date(safe(info, "mostRecentQuarter")),
        "nextEarningsApprox": ts_to_date(safe(info, "nextFiscalYearEnd")),
        "trailingPE": safe(info, "trailingPE"),
        "forwardPE": safe(info, "forwardPE"),
        "priceToSales": safe(info, "priceToSalesTrailing12Months"),
        "evToEbitda": safe(info, "enterpriseToEbitda"),
        "pegRatio": safe(info, "pegRatio"),
        "priceToBook": safe(info, "priceToBook"),
        "marketCap": market_cap,
        "marketCapFormatted": fmt_large(market_cap),
        "capCategory": cap_category,
        "operatingMargin": safe(info, "operatingMargins"),
        "netMargin": safe(info, "profitMargins"),
        "fcfMargin": fcf_margin,
        "returnOnEquity": safe(info, "returnOnEquity"),
        "returnOnAssets": safe(info, "returnOnAssets"),
        "recommendationKey": safe(info, "recommendationKey"),
        "numberOfAnalystOpinions": safe(info, "numberOfAnalystOpinions"),
        "targetMeanPrice": target_mean,
        "targetHighPrice": safe(info, "targetHighPrice"),
        "targetLowPrice": safe(info, "targetLowPrice"),
        "upsidePercent": upside,
        "shortPercentOfFloat": safe(info, "shortPercentOfFloat"),
        "heldPercentInstitutions": safe(info, "heldPercentInstitutions"),
        "heldPercentInsiders": safe(info, "heldPercentInsiders"),
        "stockYTD": stock_ytd,
        "spyYTD": spy_ytd,
        "alpha": alpha,
    }


@app.get("/api/stock/{ticker}")
async def get_stock(ticker: str):
    ticker = ticker.upper().strip()
    if ticker in _cache and time.time() - _cache[ticker]["ts"] < CACHE_TTL:
        return _cache[ticker]["data"]
    try:
        data = fetch_stock_data(ticker)
        if data is None:
            raise HTTPException(status_code=404, detail="טיקר לא נמצא, בדוק את האיות")
        _cache[ticker] = {"data": data, "ts": time.time()}
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stock/{ticker}/summary")
async def get_summary(ticker: str):
    ticker = ticker.upper().strip()

    if ticker in _cache and time.time() - _cache[ticker]["ts"] < CACHE_TTL:
        data = _cache[ticker]["data"]
    else:
        data = fetch_stock_data(ticker)
        if data is None:
            raise HTTPException(status_code=404, detail="טיקר לא נמצא")
        _cache[ticker] = {"data": data, "ts": time.time()}

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY לא מוגדר")

    client = anthropic.Anthropic(api_key=api_key)

    prompt = (
        f"אתה אנליסט פונדמנטלי מנוסה שמסייע לסוחר סווינג בבורסה האמריקאית.\n"
        f"קיבלת את הנתונים הבאים על {ticker}: {json.dumps(data, ensure_ascii=False)}\n\n"
        "כתוב סיכום קריאה מקיף בעברית. חלק אותו לפסקאות:\n"
        "1. דוחות וצמיחה — האם החברה צומחת? האם הכתה ציפיות?\n"
        "2. הערכת שווי — האם המחיר מוצדק ביחס לצמיחה?\n"
        "3. רווחיות ואיכות עסקית — עד כמה עסק זה איכותי?\n"
        "4. סנטימנט שוק — מה חושבים האנליסטים? כמה שורטים?\n"
        "5. סקטור ומאקרו — האם הסקטור חזק? מה הסיכונים?\n"
        "6. תמונה כוללת — פסקה קצרה לסוחר סווינג: מה חזק, מה מדאיג, מה לשים עליו עין.\n"
        "הדגש נתונים חיוביים וסיכונים. דבר בגובה העיניים. "
        "אל תחזור על מספרים שכבר מוצגים בממשק — הוסף פרשנות והקשר בלבד."
    )

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        return {"summary": message.content[0].text}
    except Exception:
        raise HTTPException(status_code=500, detail="לא ניתן לייצר סיכום כרגע, נסה שוב")


# Vercel serverless handler
handler = Mangum(app, lifespan="off")
