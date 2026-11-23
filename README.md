# Otomata Teorisi Laboratuvarı

Üniversite öğrencileri için Türkçe arayüzlü, interaktif ve yapay zeka destekli otomata teorisi laboratuvarı.

- **Frontend:** React (Vite), Tailwind CSS, Cytoscape.js, Lucide-React
- **Backend:** Python, FastAPI, automata-lib
- **Yapay Zeka:** Google Gemini API (`gemini-2.5-flash`)

## Kurulum

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env        # Linux/macOS: cp .env.example .env
uvicorn app.main:app --reload
```
API dokümantasyonu: http://localhost:8000/docs

### Gemini API anahtarı
Anahtarı https://aistudio.google.com/apikey adresinden alın ve `backend/.env` dosyasına yazın:
```
GEMINI_API_KEY=anahtarınız
```
`.env` dosyası `.gitignore` içindedir, GitHub'a gönderilmez. Anahtarı değiştirmek için dosyayı güncelleyip backend'i yeniden başlatmanız yeterlidir. Anahtar yokken yapay zeka dışındaki tüm özellikler çalışır.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Uygulama: http://localhost:5173

## Testler
```bash
cd backend
pytest
```
