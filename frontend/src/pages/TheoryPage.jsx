import { useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, Layers, Pyramid, Repeat, Workflow, XCircle } from 'lucide-react'
import Tex from '../components/Tex'
import { Button } from '../components/ui'

function Card({ title, children, tone = 'default' }) {
  const tones = {
    default: 'bg-white ring-slate-200',
    example: 'bg-emerald-50/50 ring-emerald-200',
    note: 'bg-indigo-50/60 ring-indigo-200',
  }
  return (
    <section className={`rounded-xl p-5 shadow-sm ring-1 ${tones[tone]}`}>
      <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  )
}

function Steps({ items }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{i + 1}</span>
          <div className="pt-0.5">{item}</div>
        </li>
      ))}
    </ol>
  )
}

function Closure({ rows }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500">
          <th className="border-b border-slate-200 py-1.5 pr-2 font-semibold">İşlem</th>
          <th className="border-b border-slate-200 py-1.5 pr-2 font-semibold">Kapalı mı?</th>
          <th className="border-b border-slate-200 py-1.5 font-semibold">Neden / nasıl</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([op, closed, why], i) => (
          <tr key={i}>
            <td className="border-b border-slate-100 py-1.5 pr-2 align-top">{op}</td>
            <td className="border-b border-slate-100 py-1.5 pr-2 align-top">
              {closed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Evet" /> : <XCircle className="h-4 w-4 text-red-500" aria-label="Hayır" />}
            </td>
            <td className="border-b border-slate-100 py-1.5 align-top text-slate-600">{why}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TryIt({ label, onClick }) {
  return (
    <Button icon={ArrowRight} onClick={onClick} className="mt-1">
      {label}
    </Button>
  )
}

function Regular({ go }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Tanım">
        <p>
          Bir <b>deterministik sonlu otomat (DFA)</b> beşli bir yapıdır:
        </p>
        <Tex block>{'M = (Q,\\ \\Sigma,\\ \\delta,\\ q_0,\\ F), \\qquad \\delta : Q \\times \\Sigma \\to Q'}</Tex>
        <p>
          <Tex>Q</Tex> sonlu durum kümesi, <Tex>\Sigma</Tex> alfabe, <Tex>q_0</Tex> başlangıç durumu, <Tex>{'F \\subseteq Q'}</Tex> kabul durumlarıdır. Geçiş
          fonksiyonu dizelere genişletilir: <Tex>{'\\hat\\delta(q,\\varepsilon)=q,\\ \\hat\\delta(q,wa)=\\delta(\\hat\\delta(q,w),a)'}</Tex>.
        </p>
        <Tex block>{'L(M) = \\{\\, w \\in \\Sigma^* \\mid \\hat\\delta(q_0, w) \\in F \\,\\}'}</Tex>
        <p>
          Bir dil bir DFA tarafından tanınabiliyorsa <b>düzenli dildir</b>.
        </p>
        <TryIt label="Sonlu Otomat sekmesinde dene" onClick={() => go('fa')} />
      </Card>

      <Card title="DFA ⇔ NFA ⇔ ε-NFA ⇔ Düzenli ifade">
        <p>Dört model de tam olarak aynı dil sınıfını, düzenli dilleri tanımlar:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>NFA → DFA:</b> alt küme yapısı. Her DFA durumu NFA durumlarının bir kümesidir; <Tex>n</Tex> durumlu NFA'dan en çok <Tex>2^n</Tex> durumlu DFA çıkar.
          </li>
          <li>
            <b>ε-NFA → NFA:</b> ε-kapanış ile ε-geçişleri kaldırılır: <Tex>{"\\delta'(q,a) = E\\big(\\delta(E(q), a)\\big)"}</Tex>.
          </li>
          <li>
            <b>Düzenli ifade → ε-NFA:</b> Thompson yapısı (birleşim, birleştirme ve yıldız için küçük parçalar).
          </li>
          <li>
            <b>Otomat → düzenli ifade:</b> durum eleme (GNFA) yöntemi. Bir <Tex>q</Tex> durumu elenirken:
            <Tex block>{'R_{ij} \\leftarrow R_{ij} \\mid R_{iq}\\,(R_{qq})^*\\,R_{qj}'}</Tex>
          </li>
        </ul>
        <p>
          Her düzenli dilin <b>tek bir</b> en küçük DFA'sı vardır (Myhill–Nerode). Minimizasyon ayırt edilemeyen durumları birleştirir.
        </p>
        <TryIt label="Dönüşümler sekmesinde dene" onClick={() => go('convert')} />
      </Card>

      <Card title="Kapanış özellikleri">
        <p>
          <Tex>L_1, L_2</Tex> düzenli ise aşağıdaki işlemlerin sonucu da düzenlidir:
        </p>
        <Closure
          rows={[
            [<Tex key="u">{'L_1 \\cup L_2'}</Tex>, true, 'Yeni başlangıçtan iki otomata ε-geçişi (veya çarpım otomatı).'],
            [<Tex key="i">{'L_1 \\cap L_2'}</Tex>, true, 'Çarpım otomatı: durumlar (p, q) çiftleri, ikisi de kabulse kabul.'],
            [<Tex key="c">{'\\overline{L_1}'}</Tex>, true, 'Tam DFA’da kabul ve kabul olmayan durumları değiştir.'],
            [<Tex key="d">{'L_1 \\setminus L_2'}</Tex>, true, <Tex key="dd">{'L_1 \\cap \\overline{L_2}'}</Tex>],
            [<Tex key="k">{'L_1 L_2'}</Tex>, true, 'Birinci otomatın kabul durumlarından ikincinin başlangıcına ε-geçişi.'],
            [<Tex key="s">{'L_1^*'}</Tex>, true, 'Kabul durumlarından başlangıca geri ε-geçişi + ε için yeni başlangıç.'],
            [<Tex key="r">{'L_1^R'}</Tex>, true, 'Okları ters çevir, başlangıç ↔ kabul (NFA olur).'],
          ]}
        />
      </Card>

      <Card title="Karar verilebilir sorular" tone="note">
        <p>Düzenli diller için şu soruların hepsi algoritmik olarak yanıtlanabilir:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Üyelik:</b> <Tex>{'w \\in L(M)'}</Tex>? DFA'yı <Tex>|w|</Tex> adım çalıştır.
          </li>
          <li>
            <b>Boşluk:</b> <Tex>{'L(M) = \\varnothing'}</Tex>? Başlangıçtan bir kabul durumuna erişilebiliyor mu?
          </li>
          <li>
            <b>Sonluluk:</b> erişilebilir ve kabule ulaşan bir döngü var mı?
          </li>
          <li>
            <b>Denklik:</b> <Tex>{'L(M_1) = L(M_2)'}</Tex>? En küçük DFA'lar aynı mı (ya da simetrik fark boş mu)?
          </li>
        </ul>
      </Card>
    </div>
  )
}

function Pumping({ go }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Düzenli diller için pompalama lemması">
        <p>
          <Tex>L</Tex> düzenli ise öyle bir <Tex>{'p \\ge 1'}</Tex> (pompalama uzunluğu) vardır ki <Tex>{'|w| \\ge p'}</Tex> olan her <Tex>{'w \\in L'}</Tex>{' '}
          dizesi <Tex>w = xyz</Tex> biçiminde yazılabilir ve:
        </p>
        <Tex block>{'|xy| \\le p, \\qquad |y| \\ge 1, \\qquad \\forall i \\ge 0:\\ x y^i z \\in L'}</Tex>
        <p>
          <b>Sezgi:</b> <Tex>p</Tex> durumlu bir DFA, <Tex>p</Tex> uzunluğunda bir dizeyi okurken <Tex>p+1</Tex> durumdan geçer; güvercin yuvası ilkesine göre bir
          durum tekrar eder. Bu iki ziyaret arasındaki parça <Tex>y</Tex> bir döngüdür; döngü istenildiği kadar (<Tex>i</Tex> kez) dönülebilir.
        </p>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">
          Lemma <b>gerekli</b> bir koşuldur, yeterli değildir: bir dilin pompalanabilmesi onun düzenli olduğunu kanıtlamaz. Lemma yalnızca bir dilin düzenli{' '}
          <b>olmadığını</b> göstermek için kullanılır.
        </p>
      </Card>

      <Card title="İspat şablonu (çelişki yöntemi)">
        <Steps
          items={[
            <>
              <Tex>L</Tex>'nin düzenli olduğunu varsay; <Tex>p</Tex> pompalama uzunluğu olsun.
            </>,
            <>
              <Tex>p</Tex>'ye bağlı, <Tex>{'|w| \\ge p'}</Tex> olan akıllıca bir <Tex>{'w \\in L'}</Tex> seç.
            </>,
            <>
              <Tex>{'|xy| \\le p,\\ |y| \\ge 1'}</Tex> koşulunu sağlayan <b>her</b> <Tex>w = xyz</Tex> ayrışımını düşün (ayrışımı sen seçemezsin).
            </>,
            <>
              Her durumda <Tex>{'xy^iz \\notin L'}</Tex> yapan bir <Tex>i</Tex> bul (genellikle <Tex>i = 0</Tex> ya da <Tex>i = 2</Tex>).
            </>,
            <>Çelişki: varsayım yanlıştır, L düzenli değildir.</>,
          ]}
        />
      </Card>

      <Card title={<>Çözümlü örnek 1: aⁿbⁿ düzenli değildir</>} tone="example">
        <Tex block>{'L = \\{\\, a^n b^n \\mid n \\ge 0 \\,\\}'}</Tex>
        <Steps
          items={[
            <>
              <Tex>L</Tex> düzenli olsun, <Tex>p</Tex> pompalama uzunluğu. <Tex>{'w = a^p b^p'}</Tex> seç; <Tex>{'|w| = 2p \\ge p'}</Tex>.
            </>,
            <>
              <Tex>{'|xy| \\le p'}</Tex> olduğundan <Tex>x</Tex> ve <Tex>y</Tex> yalnızca ilk <Tex>p</Tex> karakterde, yani a'lardadır: <Tex>{'y = a^k,\\ k \\ge 1'}</Tex>.
            </>,
            <>
              <Tex>i = 2</Tex> al: <Tex>{'xy^2z = a^{p+k} b^p'}</Tex>. <Tex>{'p + k \\ne p'}</Tex> olduğundan bu dize <Tex>L</Tex>'de değildir.
            </>,
            <>Çelişki — aⁿbⁿ düzenli değildir. (Ama bağlamdan bağımsızdır: S → aSb | ε.)</>,
          ]}
        />
        <TryIt label="Yığıtlı Otomat sekmesinde dene (aⁿbⁿ şablonu)" onClick={() => go('pda')} />
      </Card>

      <Card title={<>Çözümlü örnek 2: ww düzenli değildir</>} tone="example">
        <Tex block>{'L = \\{\\, ww \\mid w \\in \\{0,1\\}^* \\,\\}'}</Tex>
        <Steps
          items={[
            <>
              <Tex>{'s = 0^p\\,1\\,0^p\\,1'}</Tex> seç (<Tex>{'w = 0^p1'}</Tex> olduğundan <Tex>{'s \\in L'}</Tex>).
            </>,
            <>
              <Tex>{'|xy| \\le p'}</Tex> ⇒ <Tex>{'y = 0^k,\\ k \\ge 1'}</Tex>, ilk 0 bloğunun içinde.
            </>,
            <>
              <Tex>i = 2</Tex>: <Tex>{'s\' = 0^{p+k}\\,1\\,0^p\\,1'}</Tex>. <Tex>{"s'"}</Tex> tam iki tane 1 içerir ve 1 ile biter; <Tex>{"s' = uu"}</Tex> olsaydı her{' '}
              <Tex>u</Tex> bir tane 1 içerir ve 1 ile biterdi, yani <Tex>{'u = 0^m1'}</Tex>. O zaman <Tex>{'m = p + k'}</Tex> ve <Tex>{'m = p'}</Tex> olmalı ⇒{' '}
              <Tex>k = 0</Tex>, çelişki.
            </>,
          ]}
        />
        <p className="text-xs text-slate-500">
          Not: <Tex>ww</Tex> bağlamdan bağımsız da değildir; buna karşın <Tex>{'ww^R'}</Tex> (palindrom) bağlamdan bağımsızdır.
        </p>
      </Card>

      <Card title="Bağlamdan bağımsız diller için pompalama lemması">
        <p>
          <Tex>L</Tex> bağlamdan bağımsız ise öyle bir <Tex>p</Tex> vardır ki <Tex>{'|w| \\ge p'}</Tex> olan her <Tex>{'w \\in L'}</Tex>, <Tex>w = uvxyz</Tex>{' '}
          biçiminde yazılabilir ve:
        </p>
        <Tex block>{'|vxy| \\le p, \\qquad |vy| \\ge 1, \\qquad \\forall i \\ge 0:\\ u\\,v^i\\,x\\,y^i\\,z \\in L'}</Tex>
        <p>
          <b>Sezgi:</b> yeterince uzun bir dizenin ayrıştırma ağacı yeterince yüksektir; kökten yaprağa uzanan bir yolda aynı değişken iki kez görünür. Bu
          değişkenin alt ağacı içinde kendini tekrarlayan kısım <Tex>v</Tex> ve <Tex>y</Tex> parçalarını birlikte pompalar.
        </p>
      </Card>

      <Card title={<>Çözümlü örnek 3: aⁿbⁿcⁿ bağlamdan bağımsız değildir</>} tone="example">
        <Tex block>{'L = \\{\\, a^n b^n c^n \\mid n \\ge 0 \\,\\}'}</Tex>
        <Steps
          items={[
            <>
              <Tex>{'w = a^p b^p c^p'}</Tex> seç.
            </>,
            <>
              <Tex>{'|vxy| \\le p'}</Tex> olduğundan <Tex>vxy</Tex> hem a hem c içeremez (aradaki <Tex>p</Tex> tane b'yi aşamaz); en çok iki farklı harf içerir.
            </>,
            <>
              <Tex>v</Tex> veya <Tex>y</Tex> iki farklı harf içeriyorsa <Tex>i = 2</Tex> için harf sırası bozulur (ör. …ab…ab…). İçermiyorsa <Tex>i = 2</Tex>{' '}
              en çok iki harfin sayısını artırır, üçüncüsü <Tex>p</Tex>'de kalır.
            </>,
            <>
              Her durumda <Tex>{'uv^2xy^2z \\notin L'}</Tex> — çelişki. Bu dili bir Turing makinesi tanıyabilir.
            </>,
          ]}
        />
        <TryIt label="Turing Makinesi sekmesinde dene (aⁿbⁿcⁿ şablonu)" onClick={() => go('tm')} />
      </Card>
    </div>
  )
}

function ContextFree({ go }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Bağlamdan bağımsız dilbilgisi (CFG)">
        <Tex block>{'G = (V,\\ \\Sigma,\\ R,\\ S), \\qquad A \\to \\alpha,\\quad A \\in V,\\ \\alpha \\in (V \\cup \\Sigma)^*'}</Tex>
        <p>
          <Tex>V</Tex> değişkenler, <Tex>\Sigma</Tex> uçbirimler, <Tex>R</Tex> kurallar, <Tex>S</Tex> başlangıç değişkenidir. Kuralın sol tarafı her zaman{' '}
          <b>tek bir değişkendir</b>; bu yüzden değişken, çevresindeki “bağlam”dan bağımsız olarak yeniden yazılır.
        </p>
        <div className="space-y-1 rounded-lg bg-slate-50 px-3 py-2">
          <p>
            <Tex>{'S \\to aSb \\mid \\varepsilon'}</Tex> &nbsp;⇒&nbsp; <Tex>{'\\{a^nb^n\\}'}</Tex>, türetim: <Tex>{'S \\Rightarrow aSb \\Rightarrow aaSbb \\Rightarrow aabb'}</Tex>
          </p>
          <p>
            <Tex>{'S \\to (S) \\mid SS \\mid \\varepsilon'}</Tex> &nbsp;⇒&nbsp; dengeli parantezler
          </p>
          <p>
            <Tex>{'S \\to aSa \\mid bSb \\mid a \\mid b \\mid \\varepsilon'}</Tex> &nbsp;⇒&nbsp; palindromlar
          </p>
        </div>
      </Card>

      <Card title="Yığıtlı otomat (PDA)">
        <Tex block>{'P = (Q,\\ \\Sigma,\\ \\Gamma,\\ \\delta,\\ q_0,\\ Z_0,\\ F)'}</Tex>
        <Tex block>{'\\delta : Q \\times (\\Sigma \\cup \\{\\varepsilon\\}) \\times (\\Gamma \\cup \\{\\varepsilon\\}) \\to \\mathcal{P}\\big(Q \\times \\Gamma^*\\big)'}</Tex>
        <p>
          PDA, sonlu otomata sınırsız bir <b>yığıt</b> ekler. Geçiş etiketi <span className="font-mono">a, X → γ</span>: girdiden <Tex>a</Tex> oku, yığıtın
          tepesindeki <Tex>X</Tex>'i çek, yerine <Tex>\gamma</Tex> dizesini at (ilk karakter tepeye gelir).
        </p>
        <p>
          aⁿbⁿ için fikir: her a'da yığıta A at, her b'de bir A çek; girdi bittiğinde tepede yine <Tex>Z_0 = \$</Tex> varsa kabul et.
        </p>
        <TryIt label="Yığıtlı Otomat sekmesinde dene" onClick={() => go('pda')} />
      </Card>

      <Card title="CFG ⇔ PDA denkliği" tone="note">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>CFG → PDA:</b> yığıta <Tex>S</Tex> koy; tepede değişken varsa bir kuralını seçip yerine sağ tarafı yaz (ε-hamlesi), tepede uçbirim varsa
            girdiyle eşleştirip çek. Böylece PDA en soldan türetimi taklit eder.
          </li>
          <li>
            <b>PDA → CFG:</b> her durum çifti için <Tex>{'A_{pq}'}</Tex> değişkeni “yığıtı boş bırakarak p'den q'ya götüren dizeleri” üretir.
          </li>
          <li>
            <b>Deterministik olmama önemlidir:</b> DPDA'lar NPDA'lardan zayıftır. <Tex>{'ww^R'}</Tex> dilinde ortanın nerede olduğunu “tahmin etmek” gerekir, bu
            yüzden yalnızca NPDA ile tanınır.
          </li>
        </ul>
      </Card>

      <Card title="Belirsizlik ve normal biçim">
        <p>
          Bir dize iki farklı ayrıştırma ağacına sahipse dilbilgisi <b>belirsizdir</b>. Örn. <Tex>{'E \\to E+E \\mid E*E \\mid a'}</Tex> için{' '}
          <span className="font-mono">a+a*a</span> iki biçimde ayrıştırılır. Öncelik katmanlarıyla düzeltilir:
        </p>
        <Tex block>{'E \\to E + T \\mid T,\\quad T \\to T * F \\mid F,\\quad F \\to (E) \\mid a'}</Tex>
        <p>
          <b>Chomsky normal biçimi:</b> her kural <Tex>{'A \\to BC'}</Tex> ya da <Tex>{'A \\to a'}</Tex> biçimindedir (gerekirse <Tex>{'S \\to \\varepsilon'}</Tex>). Bu
          biçimdeki dilbilgisi için CYK algoritması üyeliği <Tex>{'O(n^3)'}</Tex> sürede çözer.
        </p>
      </Card>

      <Card title="Kapanış özellikleri">
        <Closure
          rows={[
            [<Tex key="u">{'L_1 \\cup L_2'}</Tex>, true, <Tex key="uu">{'S \\to S_1 \\mid S_2'}</Tex>],
            [<Tex key="k">{'L_1 L_2'}</Tex>, true, <Tex key="kk">{'S \\to S_1 S_2'}</Tex>],
            [<Tex key="s">{'L_1^*'}</Tex>, true, <Tex key="ss">{'S \\to S S_1 \\mid \\varepsilon'}</Tex>],
            [
              <Tex key="i">{'L_1 \\cap L_2'}</Tex>,
              false,
              <span key="ii">
                <Tex>{'\\{a^nb^nc^m\\} \\cap \\{a^mb^nc^n\\} = \\{a^nb^nc^n\\}'}</Tex>
              </span>,
            ],
            [<Tex key="c">{'\\overline{L_1}'}</Tex>, false, 'Kapalı olsaydı De Morgan ile kesişime de kapalı olurdu.'],
            [<Tex key="r">{'L_1 \\cap R'}</Tex>, true, 'R düzenli ise: PDA × DFA çarpım yapısı.'],
          ]}
        />
      </Card>
    </div>
  )
}

const HIERARCHY = [
  {
    type: 'Tür 3',
    name: 'Düzenli',
    grammar: 'A \\to aB \\mid a \\mid \\varepsilon',
    machine: 'DFA / NFA',
    example: '(0|1)^*01',
    color: 'bg-sky-100 ring-sky-300',
  },
  {
    type: 'Tür 2',
    name: 'Bağlamdan bağımsız',
    grammar: 'A \\to \\gamma',
    machine: 'Yığıtlı otomat (NPDA)',
    example: 'a^nb^n,\\ ww^R',
    color: 'bg-emerald-100 ring-emerald-300',
  },
  {
    type: 'Tür 1',
    name: 'Bağlama duyarlı',
    grammar: '\\alpha A \\beta \\to \\alpha \\gamma \\beta,\\ \\gamma \\ne \\varepsilon',
    machine: 'Doğrusal sınırlı otomat (LBA)',
    example: 'a^nb^nc^n',
    color: 'bg-amber-100 ring-amber-300',
  },
  {
    type: 'Tür 0',
    name: 'Özyinelemeli sayılabilir',
    grammar: '\\alpha \\to \\beta',
    machine: 'Turing makinesi',
    example: '\\text{HALT}',
    color: 'bg-rose-100 ring-rose-300',
  },
]

function Hierarchy({ go }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card title="Chomsky hiyerarşisi">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="border-b border-slate-200 py-2 pr-3 font-semibold">Tür</th>
                <th className="border-b border-slate-200 py-2 pr-3 font-semibold">Dil sınıfı</th>
                <th className="border-b border-slate-200 py-2 pr-3 font-semibold">Dilbilgisi kuralı</th>
                <th className="border-b border-slate-200 py-2 pr-3 font-semibold">Otomat</th>
                <th className="border-b border-slate-200 py-2 font-semibold">Örnek</th>
              </tr>
            </thead>
            <tbody>
              {HIERARCHY.map((row) => (
                <tr key={row.type}>
                  <td className="whitespace-nowrap border-b border-slate-100 py-2 pr-3 font-semibold text-slate-800">{row.type}</td>
                  <td className="border-b border-slate-100 py-2 pr-3">{row.name}</td>
                  <td className="whitespace-nowrap border-b border-slate-100 py-2 pr-3">
                    <Tex>{row.grammar}</Tex>
                  </td>
                  <td className="border-b border-slate-100 py-2 pr-3">{row.machine}</td>
                  <td className="whitespace-nowrap border-b border-slate-100 py-2">
                    <Tex>{row.example}</Tex>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Tex block>{'\\text{Düzenli} \\subsetneq \\text{Bağlamdan bağımsız} \\subsetneq \\text{Bağlama duyarlı} \\subsetneq \\text{Özyinelemeli} \\subsetneq \\text{Öz. sayılabilir}'}</Tex>
        <p>
          Her kapsama kesindir: aⁿbⁿ düzenli değil ama bağlamdan bağımsızdır; aⁿbⁿcⁿ bağlamdan bağımsız değil ama bağlama duyarlıdır. <b>Özyinelemeli</b>{' '}
          (karar verilebilir) diller, her girdide <i>duran</i> bir Turing makinesiyle tanınan dillerdir ve Tür 1 ile Tür 0 arasında yer alır.
        </p>
        <div className="flex flex-wrap gap-2">
          <TryIt label="Sonlu Otomat" onClick={() => go('fa')} />
          <TryIt label="Yığıtlı Otomat" onClick={() => go('pda')} />
          <TryIt label="Turing Makinesi" onClick={() => go('tm')} />
        </div>
      </Card>

      <div className="space-y-4">
        <Card title="Kümeler iç içe">
          <div className="mx-auto max-w-sm">
            {HIERARCHY.reduce(
              (inner, row) => (
                <div className={`rounded-2xl p-3 pt-2 ring-1 ${row.color}`}>
                  <p className="mb-2 text-xs font-semibold text-slate-700">
                    {row.type} · {row.name} <span className="font-normal text-slate-500">({row.machine})</span>
                  </p>
                  {inner}
                </div>
              ),
              null,
            )}
          </div>
        </Card>
        <Card title="Turing makinesi ve sınırlar" tone="note">
          <Tex block>{'M = (Q, \\Sigma, \\Gamma, \\delta, q_0, \\sqcup, F),\\quad \\delta : Q \\times \\Gamma \\to Q \\times \\Gamma \\times \\{L, R\\}'}</Tex>
          <p>
            <b>Church–Turing tezi:</b> algoritmayla hesaplanabilen her şey bir Turing makinesiyle hesaplanabilir.
          </p>
          <p>
            <b>Durma problemi</b> (HALT) Turing ile tanınabilir ama karar verilemez: her girdide duran bir makine onu tanıyamaz. Tümleyeni ise Turing ile tanınabilir
            bile değildir.
          </p>
        </Card>
      </div>
    </div>
  )
}

const TOPICS = [
  { id: 'regular', label: 'Düzenli Diller', icon: Workflow, Component: Regular },
  { id: 'pumping', label: 'Pompalama Lemması', icon: Repeat, Component: Pumping },
  { id: 'cfl', label: 'Bağlamdan Bağımsız Diller', icon: Layers, Component: ContextFree },
  { id: 'chomsky', label: 'Chomsky Hiyerarşisi', icon: Pyramid, Component: Hierarchy },
]

export default function TheoryPage({ onNavigate }) {
  const [topic, setTopic] = useState('regular')
  const current = TOPICS.find((t) => t.id === topic)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <BookOpen className="h-5 w-5 text-indigo-500" /> Konu Anlatımı
        </h2>
        <nav className="flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200" aria-label="Konular">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTopic(t.id)}
              aria-current={topic === t.id ? 'page' : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                topic === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <t.icon className="h-4 w-4" aria-hidden />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <current.Component go={onNavigate} />
    </div>
  )
}
