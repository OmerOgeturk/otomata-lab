Sen kıdemli bir Full-Stack Yazılım Mühendisi ve Bilgisayar Mühendisliği (Otomata Teorisi ve Biçimsel Diller) uzmanısın. Üniversite öğrencileri için Türkçe arayüzlü, modern, interaktif ve yapay zeka destekli bir "Otomata Teorisi Laboratuvarı" web uygulaması geliştirmek istiyorum.

### 1. Teknoloji Yığını (Sıfır Maliyetli, Tam Proje Mimarisi)
- **Frontend:** React (Vite), Tailwind CSS, Cytoscape.js (otomat grafiği çizimi ve adım adım animasyon), Lucide-React (ikonlar).
- **Backend:** Python, FastAPI, `automata-lib` (DFA, NFA, e-NFA, PDA ve DTM için matematiksel dönüşümler ve doğrulama motoru).
- **Yapay Zeka:** Google Gemini API (`gemini-2.5-flash` - Structured Output / JSON Mode ile).
- **Kayıt ve Paylaşım Katmanı (`storageService.js`):** Başlangıçta `LocalStorage` + JSON İndir/Yükle olarak çalışacak; ancak ileride arayüz kodunu bozmadan URL ile paylaşım veya Supabase veritabanına geçilebilmesi için tüm kaydetme/yükleme işlemleri izole bir servis katmanında (`src/services/storageService.js`) soyutlanacak.

### 2. Standart JSON Veri Şemaları
Frontend, Backend ve Yapay Zeka arasındaki tüm iletişim şu standart JSON yapılarıyla sağlanacak:
- **DFA / NFA / e-NFA:** `type`, `states`, `alphabet`, `start_state`, `accept_states`, `transitions: [{ from, to, symbol }]`
- **PDA:** Yukarıdakilere ek olarak `stack_alphabet`, `initial_stack_symbol` (örn. `$`), `transitions: [{ from, to, input, pop, push }]` (epsilon için `ε` kullanılacak, örn: `a, ε -> 1` veya `ε, $ -> ε`).
- **Turing Makinesi (DTM):** `states`, `input_alphabet`, `tape_alphabet`, `blank_symbol`, `start_state`, `accept_states`, `transitions: [{ from, to, read, write, move: "L" | "R" }]`

### 3. Uygulama Modülleri ve Özellikler

1. **DFA / NFA / e-NFA Çizim ve Test Tuvali (Cytoscape.js):**
   - Kullanıcı tuvale tıklayarak durum (state) ekleyebilmeli, başlangıç ve kabul (çift daire) durumlarını belirleyebilmeli, durumlar arası geçiş okları çizebilmeli.
   - Girdi dizesi (örn. `01011`) verildiğinde, aktif durum ve geçiş oku adım adım animasyonla vurgulanmalı ve sonuç (Kabul / Red) gösterilmeli.
   - Yan panelde canlı güncellenen Geçiş Tablosu (Transition Table) bulunmalı.

2. **Algoritmik Dönüşüm Merkezi (FastAPI + `automata-lib`):**
   - e-NFA / NFA → DFA dönüşümü (Subset Construction).
   - DFA Minimizasyonu.
   - Otomatı matematiksel Düzenli İfadeye (Regex) çevirme.
   - Hazır şablonlar ("11 içermeyen dizeler", "01 ile bitenler", "Çift sayıda 0 içerenler" vb.).

3. **Yapay Zeka Asistanı (Hibrit Mimari):**
   - **Metinden Otomat Çizimi:** Kullanıcı doğal dilde kural yazdığında (örn. "11 içermeyen dizeler NFA çizimi"), Gemini API bunu standart JSON şemasına çevirmeli ve tuvale otomatik çizdirmeli.
   - **Otomatın Dilini Bulma:** Kullanıcı ekrana bir DFA/NFA çizdiğinde, önce Backend bunu kesin olarak Regex'e çevirmeli; ardından bu Regex ve geçiş tablosu Gemini API'ye gönderilerek otomatın hangi dili tanıdığı anlaşılır Türkçe ile açıklanmalı.

4. **İnteraktif PDA (Yığıtlı Otomat) Modülü:**
   - Çizim tuvali `girdi, çek -> at` formatındaki geçiş etiketlerini desteklemeli.
   - Ekranın sağında **Canlı Yığıt (Stack) Görselleştirmesi** bulunmalı; dize adım adım test edilirken yığıta giren/çıkan semboller animasyonla görülmeli.
   - Arka planda `automata-lib` PDA motoru ile doğrulama yapılmalı ve hazır örnekler (örn. $a^n b^n$, palindromlar) eklenmeli.

5. **Turing Makinesi Simülatörü (Doğrulanmış Şablon Tabanlı):**
   - Serbest yapay zeka çizimi yerine, matematiksel doğruluğu kesin hazır klasik şablonlar (örn. $a^n b^n c^n$ tanıyan TM, ikili sayı 1 artırma) sunulmalı.
   - Ekranın altında veya üstünde **Canlı Şerit (Tape) ve Okuma/Yazma Kafası** görselleştirmesi olmalı; kullanıcı kafa hareketini (Sağ/Sol) ve şerit üzerindeki değişimleri adım adım izleyebilmeli.
   - Tüm adımlar Backend'de `automata-lib` `DTM` sınıfı ile hesaplanmalı.

6. **Konu Anlatımı ve Referans Sekmesi (Pasif Modül):**
   - Pumping Lemma (Pompalama Lemması - interaktif olmayacak, sadece ispat adımları, formüller ve çözümlü örnekler), Düzenli Diller, Bağlamdan Bağımsız Diller ve Chomsky Hiyerarşisi için temiz çalışma kartları.

### 4. Çalışma Kuralları
- Kodları temiz, okunabilir, modüler ve gereksiz açıklayıcı yorum satırlarından arındırılmış şekilde yaz.
- Tüm kodu tek seferde verme. Önce projenin klasör yapısını ve kurulum komutlarını paylaş.
- Onayımı aldıktan sonra şu fazlarla ilerleyelim:
  - **Faz 1:** Backend (FastAPI + `automata-lib` dönüşüm/simülasyon endpointleri + Gemini API entegrasyonu).
  - **Faz 2:** Frontend temel iskelet, `storageService.js` (LocalStorage + JSON indir/yükle) ve Cytoscape.js DFA/NFA tuvali.
  - **Faz 3:** İnteraktif PDA (Canlı Yığıt) ve Şablonlu Turing Makinesi (Canlı Şerit) modülleri.
  - **Faz 4:** Yapay Zeka Asistanı arayüz bağlantısı ve pasif Konu Anlatımı (Pumping Lemma vb.) sekmesi.

Hazırsan proje klasör yapısı ve kurulum adımlarıyla başla.