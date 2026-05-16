# ניתוח פונדמנטלי מניות

אפליקציית ווב לניתוח פונדמנטלי מהיר של מניות אמריקאיות.

## הפעלה

### Backend (Python)

```bash
cd backend

# התקנת תלויות (פעם אחת)
pip install -r requirements.txt

# הגדרת מפתח Claude (נדרש רק לסיכום AI)
copy .env.example .env
# ערוך את .env והכנס את ה-ANTHROPIC_API_KEY שלך

# הפעלת השרת
uvicorn main:app --reload
```

השרת יעלה על: http://localhost:8000

### Frontend (React)

```bash
cd frontend

# התקנת תלויות (פעם אחת)
npm install

# הפעלה בסביבת פיתוח
npm run dev
```

האפליקציה תעלה על: http://localhost:5173

---

## שימוש

1. הפעל את ה-Backend וה-Frontend בשני חלונות טרמינל נפרדים
2. פתח http://localhost:5173 בדפדפן
3. הכנס טיקר (לדוגמה: NVDA) ולחץ "נתח מניה"
4. עיין בטאבים: דוחות · שווי · רווחיות · סנטימנט · סקטור
5. בטאב "סיכום AI" — לחץ על הכפתור לקבלת ניתוח מ-Claude

## מבנה הפרויקט

```
backend/
  main.py          - FastAPI server + yfinance + Claude API
  requirements.txt
  .env             - ANTHROPIC_API_KEY (צור בעצמך)

frontend/
  src/App.jsx      - כל הלוגיקה וה-UI
  src/App.css      - עיצוב
  vite.config.js   - proxy לבאקאנד
```

## נתונים

- **מקור:** Yahoo Finance דרך `yfinance` — חינמי, ללא API key
- **Cache:** תוצאות נשמרות בזיכרון לשעה אחת לפי טיקר
- **סיכום AI:** דורש `ANTHROPIC_API_KEY`, עולה ~$0.01-0.03 לסיכום
