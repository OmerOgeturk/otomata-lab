# Yapılacaklar ve Devam Notları

Son güncelleme: 2026-11-24 — son commit: Faz 4 + gerçek Gemini testi.

## Durum özeti
| Faz | Kapsam | Durum |
|---|---|---|
| 0 | Repo, README, .gitignore, spec (`docs/spec.md`) | ✅ Bitti |
| 1 | Backend: FastAPI + automata-lib + Gemini servisi, 61 pytest | ✅ Bitti |
| 2 | Frontend iskelet, storageService, Cytoscape DFA/NFA tuvali, Dönüşümler | ✅ Bitti (Edge ile uçtan uca test edildi) |
| 3 | PDA (canlı yığıt) + Turing Makinesi (canlı şerit) | ✅ Bitti (Edge ile uçtan uca test edildi) |
| 4 | Yapay Zeka arayüzü + Konu Anlatımı | ✅ Bitti (gerçek Gemini anahtarıyla Edge'de test edildi) |

## Çalışma kuralları (kullanıcı kararları)
- Her faz bitince commit + `git push`, ardından **kullanıcı onayı beklenir**.
- Gemini API anahtarı **asla** repoya girmez: yalnızca `backend/.env` (gitignore'da). Push öncesi kontrol:
  `git ls-files | grep -iE "(^|/)\.env"` (yalnızca `.env.example` çıkmalı) ve anahtarın kendisini aramak: `k=$(sed -n 's/^GEMINI_API_KEY=//p' backend/.env); [ -n "$k" ] && git diff --cached | grep -qF "$k" && echo SIZINTI || echo temiz`. Yeni Google anahtarları `AIza` yerine `AQ.` ile başlayabilir; desen taraması yetmez.
- Anahtar her AI isteğinde `.env`'den yeniden okunur (`load_dotenv(override=True)`), değiştirmek için yeniden başlatma gerekmez. Kullanıcının anahtarı `backend/.env` içinde tanımlı (2026-11-24).
- Commit kimliği repo bazlı: `OmerOgeturk <202535117+OmerOgeturk@users.noreply.github.com>`.
- Tuzak durumu (∅) içeren tam DFA minimizasyon çıktısı kullanıcı tarafından onaylandı.
- Kod: temiz, modüler, gereksiz yorum satırı yok; arayüz metinleri Türkçe.

## Ortamı ayağa kaldırma
```bash
# backend (venv zaten kurulu: backend/.venv)
cd backend && .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
cd backend && .venv/Scripts/python -m pytest -q        # 61 test geçmeli

# frontend (node_modules kurulu değilse: npm install)
cd frontend && npm run dev                              # http://localhost:5173, /api -> 8000 proxy
cd frontend && npm run build                            # hatasız derlenmeli
```
Tarayıcı testi: geçici bir klasöre `playwright-core` kurup `chromium.launch({ channel: 'msedge' })` ile kurulu Edge kullanılabilir (tarayıcı indirmeye gerek yok). Not: yeni tarayıcı bağlamında localStorage boştur.

## Mimari notlar (yeniden keşfetmemek için)
- **Backend API (hazır):** `/api/pda/simulate` `{automaton, input, max_configurations}` → `{accepted, verified, limit_reached, steps:[{index, state, consumed, remaining, stack (alttan üste), transition}]}`; `/api/pda/templates` (anbn, even-palindrome, palindrome, balanced-parens). `/api/tm/simulate` `{machine, input, max_steps}` → `{result: accepted|rejected|limit, steps:[{index, state, tape[], head, transition}], output}`; `/api/tm/templates` (anbncn, 0n1n, binary-increment). `frontend/src/services/api.js` içinde `api.pda.*`, `api.tm.*`, `api.ai.*` fonksiyonları zaten tanımlı.
- **PDA şeması:** geçiş `{from, to, input, pop, push}`; ε = `ε`; `push` dizesinin **ilk karakteri yığıtın tepesine** gelir. Başlangıç yığıt sembolü varsayılan `$`. Kabul: son durum ile.
- **TM şeması:** `{from, to, read, write, move: "L"|"R"}`, boşluk sembolü varsayılan `_`; kabul durumundan geçiş tanımlanamaz; başlangıç durumu kabul durumu olamaz. TM'nin şeridi sola uzarsa automata-lib başa ekler, `head` indeksi ona göre gelir.
- **Yeniden kullanılacak frontend parçaları:**
  - `components/AutomatonCanvas.jsx` — genel Cytoscape tuvali (props: `nodes, edges, positions, highlight{nodes,edges,result}, mode, selected, fitKey, onAddState, onConnect, onSelect, onDelete, onMove`; `ref.fit()`). Kenar etiketleri çok satır destekler (`text-wrap: wrap`) → PDA/TM için `groupEdges(..., labelOf, '\n')` kullan.
  - `lib/graph.js` — `toCanvas(machine, labelOf, sep)`, `groupEdges`, `renameIn`, `removeStateIn`, `toggleAcceptIn`, `removeEdgeIn`, `autoLayout`, `ensurePositions`, `nextStateName`, `EPS`, `isEps`, `showEps` (tüm modüller `states/start_state/accept_states/transitions[{from,to}]` yapısını paylaşır).
  - `hooks/useStepper.js` (`useStepper(total, resetKey)`), `components/StepControls.jsx`, `hooks/useTemplates.js`, `components/FileMenu.jsx` (`kind` parametresiyle `pda`, `tm` için de çalışır), `components/ui.jsx` (Button, IconButton, Panel, Field, Alert, Dialog, Badge, Placeholder, `inputClass` — genişlik sınıfını ayrıca ver).
  - `services/storageService.js` — `list/save/load/remove/saveDraft/loadDraft/exportJSON/importJSON(file, kind)`; `kind` = `fa` | `pda` | `tm`.
  - `hooks/useDocument.js` — `useDocument(kind, prepare)` → `{doc, setDoc, loadDoc, fitKey}`; taslağı yükler/otomatik kaydeder. `App.jsx` üç modül için (`fa`, `pda`, `tm`) kullanıyor; AI ve Konu sekmeleri de bağlı (`pages/AIPage.jsx`, lazy yüklenen `pages/TheoryPage.jsx`). AI'dan tuvale aktarma: `fa.loadDoc({ name, automaton })` + `setTab('fa')`.
  - Faz 3 parçaları: `lib/pda.js` (`parseRules`, `pdaRule`, `setEdgeRules`), `lib/tm.js` (`tmTable`, `withAbsolutePositions`), `components/StackView.jsx`, `components/TapeView.jsx`, `pages/PDAPage.jsx`, `pages/TMPage.jsx`. `FAInspector` PDA'da da kullanılıyor (`editLabel` prop'u).
- **Faz 4 parçaları:** `components/Markdown.jsx` (HTML enjekte etmeyen basit Markdown → React; regex içindeki `*` italiğe dönmez), `components/Tex.jsx` (KaTeX), `components/MiniCanvas.jsx` (ConvertPage'den ayrıldı). AI durumu App'te (`aiState`) tutulur, sekme değişince kaybolmaz. Backend `GET /api/ai/status` → `{configured, model}`. API hataları `error.status` taşır (503 = anahtar yok).
- Gemini'siz uçtan uca test: Playwright `page.route('**/api/ai/*', ...)` ile sahte yanıt (`scratchpad` betiği örneği: generate → sabit DFA, explain → gerçek `/api/fa/to-regex` + sahte Markdown).
- Gemini yoğunluğu: o an hangi modellerin yanıt verdiğini görmek için `.venv/Scripts/python` ile `client.models.generate_content` küçük bir istek atılabilir; yanıtlar 20–70 sn sürebiliyor. Python test betiklerinde `localhost` yerine `127.0.0.1` kullan (Windows'ta IPv6 denemesi her istekte ~2 sn kaybettirir).
- **Bilinen tuzaklar:** Cytoscape kapsayıcıya `position: relative` yazar → kapsayıcı `h-full w-full`, dış sarmalayıcı `absolute inset-0` olmalı. automata-lib'de geçici nesne üzerinde metod çağırmak (`DFA.from_nfa(x).isempty()`) "garbage collected" hatası verir → önce değişkene ata. Windows konsolunda `∅` yazdırmak için `PYTHONIOENCODING=utf-8`. automata-lib DTM şeridi sola uzadığında başa boşluk ekler ve `head` 0'da kalır → `withAbsolutePositions` bunu telafi eder. Playwright testinde `getByLabel('Girdi dizesi')` iki öğe bulur (InputTape de aynı etikete sahip) → `input[aria-label=...]` kullan. Yeni npm bağımlılığı eklenince Vite ilk açılışta bağımlılıkları optimize edip sayfayı yeniden yükler; ilk test zaman aşımına uğrayabilir.

## Faz 3 — PDA ve Turing Makinesi
- [x] `lib/pda.js`: `emptyPDA`, `normalizePDA`, etiket ayrıştırma/biçimlendirme `girdi, çek → at` (örn. `a, ε → A`, `ε, $ → $`; `->` ve `→` ikisi de kabul edilsin), geçişleri kenar başına çok satırlı etiket olarak gruplama.
- [x] `pages/PDAPage.jsx`: FAPage desenine benzer düzenleyici (modlar, alfabe + yığıt alfabesi + başlangıç yığıt sembolü alanları, şablon menüsü, FileMenu `kind="pda"`), geçiş ekleme diyaloğunda birden çok `girdi, çek → at` satırı.
- [x] `components/StackView.jsx`: sağ panelde canlı yığıt; adımlar arasında giren/çıkan sembol animasyonu (push: yukarıdan kayarak, pop: soluklaşarak), tepe işaretçisi.
- [x] PDA simülasyon paneli: girdi şeridi (`InputTape`), uygulanan geçiş metni, `verified` (automata-lib doğrulaması) ve `limit_reached` uyarısı.
- [x] `lib/tm.js` + `pages/TMPage.jsx`: **şablon tabanlı** (spec: serbest çizim yok) — şablon seçici, salt okunur graf (durum + geçiş vurgusu), geçiş tablosu (durum × okunan sembol → yaz/hareket/hedef).
- [x] `components/TapeView.jsx`: canlı şerit hücreleri + okuma/yazma kafası, kafa L/R hareketi ve yazılan hücre animasyonu, şerit görünür pencere içinde kafayı ortalama; sonuç (kabul/red/adım sınırı) ve çıktı (`output`).
- [x] App.jsx: PDA/TM doküman state'i + taslak kaydetme; Placeholder'ları kaldır.
- [x] `npm run build`, Edge ile uçtan uca test (aⁿbⁿ `aabb` kabul / `aab` red; TM `aabbcc` kabul, ikili +1 `1011` → `1100`), README güncelle, commit + push, onay bekle.

## Faz 4 — Yapay Zeka ve Konu Anlatımı
- [x] `pages/AIPage.jsx` — **Metinden otomat:** metin kutusu + örnek istemler → `api.ai.generate(prompt)` → sonucu önizle ve "Tuvale aktar" (App'teki `loadFaDoc` + sekmeyi `fa` yap).
- [x] **Otomatın dilini bulma:** mevcut FA dokümanı → `api.ai.explain(automaton)` → kesin regex (backend) + Gemini'nin Markdown açıklaması (basit güvenli Markdown render; HTML enjekte etme).
- [x] Anahtar yokken (HTTP 503) dostça bilgilendirme kartı: anahtarın nereden alınacağı (https://aistudio.google.com/apikey) ve `backend/.env` içine `GEMINI_API_KEY=` yazılacağı; FA sekmesine "Dilini açıkla" kısayolu.
- [x] `pages/TheoryPage.jsx` — pasif çalışma kartları: Düzenli Diller (tanım, kapanış özellikleri, DFA/NFA/regex denkliği), Pompalama Lemması (düzenli + bağlamdan bağımsız; ispat adımları, formüller, çözümlü örnekler: aⁿbⁿ, ww, aⁿbⁿcⁿ), Bağlamdan Bağımsız Diller (CFG, PDA denkliği), Chomsky Hiyerarşisi (tablo: tür, dilbilgisi, otomat, örnek). Formüller için KaTeX (`katex` npm paketi) kullan.
- [x] README güncelle, commit + push.
- [x] **Gerçek Gemini anahtarıyla test:** 5 örnek istemin hepsi 8 karaktere kadar tüm dizelerde doğru otomat üretti; açıklama ve arayüz akışı çalışıyor. `gemini-2.5-flash` yeni kullanıcılara kapalı → varsayılan `gemini-3.8-flash`; yoğunluk (503/504) için yedek model zinciri, 30 sn zaman aşımı ve Türkçe hata mesajları eklendi. Markdown'da `$…$` formülleri KaTeX ile gösteriliyor.

## Son rötuşlar (isteğe bağlı, Faz 4 sonrası)
- [ ] Toplu test (birden çok dizeyi aynı anda kabul/red listesi).
- [ ] Mobil/dar ekran düzeni kontrolü, karanlık tema.
- [ ] URL ile paylaşım adaptörü (`setStorageAdapter`) veya Supabase.
- [ ] Frontend paketini parçalara bölme (cytoscape ayrı chunk).
