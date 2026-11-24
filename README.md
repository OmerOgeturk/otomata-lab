# Otomata Teorisi Laboratuvarı

Üniversite öğrencileri için Türkçe arayüzlü, interaktif ve yapay zeka destekli otomata teorisi laboratuvarı.

- **Frontend:** React (Vite), Tailwind CSS, Cytoscape.js, Lucide-React
- **Backend:** Python, FastAPI, automata-lib
- **Yapay Zeka:** Google Gemini API (varsayılan `gemini-3.8-flash`, yoğunlukta yedek modellere otomatik geçiş)

Geliştirme durumu ve kalan işler: [docs/YAPILACAKLAR.md](docs/YAPILACAKLAR.md)

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

Model `GEMINI_MODEL` ile seçilir; model yoğun (503) veya zaman aşımına düşerse `GEMINI_FALLBACK_MODELS` listesindeki modeller sırayla denenir (varsayılan `gemini-3.7-flash,gemini-3.1-flash-lite`). Not: `gemini-2.5-flash` yeni kullanıcılara kapatıldığı için varsayılan model güncellendi.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Uygulama: http://localhost:5173 (geliştirme sunucusu `/api` isteklerini otomatik olarak `localhost:8000`'e yönlendirir; backend'in açık olması gerekir).

## Kullanım
- **Sonlu Otomat sekmesi:** araç çubuğundan *Durum ekle* modunu seçip tuvale tıklayın, *Geçiş ekle* modunda kaynak ve hedef duruma tıklayıp sembolleri girin (`0,1`; ε-NFA'da `ε` veya `eps`). Bir durumu seçerek başlangıç/kabul durumu yapabilir, yeniden adlandırabilirsiniz.
- **Test:** girdi dizesini yazıp *Test et*'e basın; oynat/ileri/geri ile aktif durum ve kullanılan geçişler adım adım vurgulanır.
- **Dönüşümler sekmesi:** NFA → DFA, minimizasyon ve düzenli ifade; sonucu tek tıkla tuvale aktarabilirsiniz.
- **Kaydetme:** çalışma alanı tarayıcıya otomatik taslak olarak kaydedilir. Ayrıca adlandırılmış kayıt, JSON indirme ve yükleme vardır. Tüm kayıt işlemleri `frontend/src/services/storageService.js` üzerinden yapılır; ileride Supabase vb. için yalnızca `setStorageAdapter` ile yeni bir adaptör vermek yeterlidir.
- **Yığıtlı Otomat sekmesi:** durumları aynı şekilde çizin; geçiş penceresine her satıra bir kural yazın: `girdi, çek → at` (örn. `a, ε → A`, `ε, $ → $`; `->` de olur). Σ, Γ ve başlangıç yığıt sembolü Z₀ araç çubuğundan ayarlanır. Test sırasında sağdaki **canlı yığıt** her adımda eklenen/çıkarılan sembolleri animasyonla gösterir; sonuç automata-lib NPDA motoruyla doğrulanır. Kabul: girdi bitince kabul durumunda olmak.
- **Turing Makinesi sekmesi:** doğruluğu kesin klasik makinelerden birini seçin (aⁿbⁿcⁿ, 0ⁿ1ⁿ, ikili +1), girdiyi yazıp *Çalıştır*'a basın. **Canlı şerit** üzerinde okuma/yazma kafası ve yazılan hücreler adım adım izlenir; geçiş tablosunda sıradaki geçiş vurgulanır. Sonsuz döngülere karşı adım sınırı ayarlanabilir. Kendi makinenizi JSON olarak yükleyebilirsiniz (sunucuda doğrulanır).
- **Yapay Zeka sekmesi:** dili Türkçe tarif edin (örn. “1'lerin sayısı 3'ün katı olan ikili dizeler”), *Otomat üret* ile Gemini otomatı çizsin; önizleyip *Tuvale aktar* ile düzenleyiciye alın. *Otomatın dilini bul* bölümü, tuvaldeki otomatın kesin düzenli ifadesini sunucuda türetir ve Gemini'ye sade bir Türkçe açıklama yazdırır. Sonlu Otomat sekmesindeki *Dilini yapay zekayla açıkla* düğmesi aynı işlemi tek tıkla yapar. Anahtar tanımlı değilse sekme, anahtarın nasıl ekleneceğini gösteren bir kart açar.
- **Konu Anlatımı sekmesi:** Düzenli Diller, Pompalama Lemması (çözümlü aⁿbⁿ, ww, aⁿbⁿcⁿ örnekleriyle), Bağlamdan Bağımsız Diller ve Chomsky Hiyerarşisi kartları; formüller KaTeX ile gösterilir, kartlardan ilgili modüle geçilebilir.

## Testler
```bash
cd backend
pytest
```

## API Uç Noktaları
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
| GET | `/api/ai/status` | Gemini anahtarı tanımlı mı? |
| POST | `/api/ai/generate` | Doğal dilden otomat (Gemini) |
| POST | `/api/ai/explain` | Otomatın dilini Türkçe açıklama (Gemini) |

PDA geçişlerinde `push` dizesinin ilk karakteri yığıtın en üstüne gelir (ör. `AB` → üstte `A`).
