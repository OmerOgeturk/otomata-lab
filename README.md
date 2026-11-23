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
`.env` dosyası `.gitignore` içindedir, GitHub'a gönderilmez. Anahtar her yapay zeka isteğinde `.env` dosyasından yeniden okunur; değiştirmek için dosyayı güncellemeniz yeterlidir (yeniden başlatma gerekmez). Anahtar yokken yapay zeka dışındaki tüm özellikler çalışır.

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

## API Uç Noktaları (Faz 1)
| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/api/fa/simulate` | DFA/NFA/ε-NFA adım adım simülasyon |
| POST | `/api/fa/nfa-to-dfa` | Alt küme yapısı (subset construction) |
| POST | `/api/fa/minimize` | DFA minimizasyonu |
| POST | `/api/fa/to-regex` | Otomat → düzenli ifade |
| GET | `/api/fa/templates` | Hazır DFA/NFA şablonları |
| POST | `/api/pda/simulate` | PDA simülasyonu (yığıt izi) |
| GET | `/api/pda/templates` | aⁿbⁿ, palindrom vb. |
| POST | `/api/tm/simulate` | DTM simülasyonu (şerit + kafa izi) |
| GET | `/api/tm/templates` | aⁿbⁿcⁿ, ikili +1 vb. |
| POST | `/api/ai/generate` | Doğal dilden otomat (Gemini) |
| POST | `/api/ai/explain` | Otomatın dilini Türkçe açıklama (Gemini) |

PDA geçişlerinde `push` dizesinin ilk karakteri yığıtın en üstüne gelir (ör. `AB` → üstte `A`).
