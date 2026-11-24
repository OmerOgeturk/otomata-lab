import Tex from '../../components/Tex'
import { Card, Steps, TryIt } from '../../components/theory'

const m = String.raw

function Term({ tr, en }) {
  return (
    <>
      <b>{tr}</b> <span className="text-slate-400">({en})</span>
    </>
  )
}

function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            {head.map((h) => (
              <th key={h} className="border-b border-slate-200 py-1.5 pr-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td key={j} className="border-b border-slate-100 py-1.5 pr-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Week1({ go }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Temel kavramlar">
        <p>
          <Term tr="Alfabe" en="alphabet" /> <Tex>\Sigma</Tex> sonlu, boş olmayan bir semboller kümesidir. <Term tr="Dize" en="string" /> alfabeden sembollerin sonlu dizisidir;{' '}
          <Tex>{m`|w|`}</Tex> uzunluğu, <Tex>\varepsilon</Tex> boş dizeyi gösterir. <Tex>{m`\Sigma^*`}</Tex> tüm dizelerin kümesidir ve her{' '}
          <Term tr="dil" en="language" /> bunun bir alt kümesidir: <Tex>{m`L \subseteq \Sigma^*`}</Tex>.
        </p>
        <p>
          Bir otomat dizeyi soldan sağa, sembol sembol okur; her sembolde durum değiştirir. Dize bitince bir <Term tr="kabul durumunda" en="accept state" /> ise dize kabul edilir.
        </p>
      </Card>
      <Card title="DFA'nın biçimsel tanımı">
        <Tex block>{m`M = (Q,\ \Sigma,\ \delta,\ q_0,\ F), \qquad \delta : Q \times \Sigma \to Q`}</Tex>
        <p>
          Deterministik demek, her durumdan her sembol için <b>tam olarak bir</b> geçiş olması demektir. Eksik geçişler varsa bir <Term tr="tuzak durumu" en="trap / dead state" /> eklenir:
          girip çıkılamayan, kabul etmeyen bir durum.
        </p>
        <Tex block>{m`L(M) = \{\, w \in \Sigma^* \mid \hat\delta(q_0, w) \in F \,\}`}</Tex>
      </Card>
      <Card title="DFA tasarlama yöntemi" tone="note">
        <Steps
          items={[
            'Dizeyi okurken neyi "hatırlamanız" gerektiğine karar verin (son okunan semboller, bir sayacın değeri, bir alt dizenin görülüp görülmediği…).',
            'Her olası "hatıra" için bir durum açın; başlangıçta hiçbir şey okunmamış durumdur.',
            'Her durum ve her sembol için yeni hatırayı bulup geçişi çizin.',
            'Dili sağlayan hatıraları kabul durumu yapın; birkaç kısa dizeyle deneyin.',
          ]}
        />
      </Card>
      <Card title="Çözümlü örnek: 01 ile biten ikili dizeler" tone="example">
        <p>
          Hatırlanacak şey: son iki sembolün <i>01</i>'e ne kadar yaklaştığı. <Tex>q_0</Tex>: ilerleme yok, <Tex>q_1</Tex>: son sembol 0, <Tex>q_2</Tex>: son iki sembol 01 (kabul).
        </p>
        <Table
          head={['δ', '0', '1']}
          rows={[
            [<Tex key="a">{m`\to q_0`}</Tex>, 'q1', 'q0'],
            ['q1', 'q1', 'q2'],
            [<Tex key="b">{m`{*}\,q_2`}</Tex>, 'q1', 'q0'],
          ]}
        />
        <TryIt label="Sonlu Otomat sekmesinde çiz ve test et" onClick={() => go('fa')} />
      </Card>
    </div>
  )
}

export function Week2({ go }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Belirsizlik fikri">
        <p>
          Bir <Term tr="NFA" en="nondeterministic finite automaton" /> bir durumdan aynı sembolle birden çok duruma gidebilir ya da hiç gidemeyebilir. Makinenin tüm olasılıkları
          aynı anda izlediğini düşünün: <b>en az bir yol</b> kabul durumunda biterse dize kabul edilir.
        </p>
        <Tex block>{m`\delta : Q \times \Sigma_\varepsilon \to \mathcal{P}(Q), \qquad \Sigma_\varepsilon = \Sigma \cup \{\varepsilon\}`}</Tex>
        <p>
          <Term tr="ε-geçişleri" en="epsilon transitions" /> sembol okumadan durum değiştirir. Bir durum kümesinin <Term tr="ε-kapanışı" en="ε-closure" />, oradan yalnızca ε ile
          ulaşılabilen tüm durumlardır.
        </p>
      </Card>
      <Card title="NFA ⇔ DFA denkliği: alt küme yapısı" tone="note">
        <Steps
          items={[
            <>DFA'nın her durumu NFA durumlarının bir kümesidir; başlangıç, <Tex>{m`E(\{q_0\})`}</Tex> ε-kapanışıdır.</>,
            <>Bir küme <Tex>R</Tex> ve sembol <Tex>a</Tex> için hedef: <Tex>{m`E\big(\bigcup_{r\in R} \delta(r,a)\big)`}</Tex>.</>,
            'İçinde en az bir NFA kabul durumu olan kümeler DFA\'da kabul durumudur.',
            <>Boş küme <Tex>\varnothing</Tex> tuzak durumu olur. En kötü durumda <Tex>{m`2^{|Q|}`}</Tex> durum oluşur.</>,
          ]}
        />
        <TryIt label="Dönüşümler sekmesinde NFA → DFA dene" onClick={() => go('convert')} />
      </Card>
      <Card title="Ne zaman NFA?" tone="example">
        <p>
          "Sondan üçüncü sembolü 1 olan dizeler" için NFA 4 durumla yazılır: <i>1</i>'i gördüğünüzde "bu sondan üçüncü olabilir" diye tahmin edip iki sembol daha beklersiniz. Eşdeğer
          DFA son üç sembolü hatırlamak zorunda olduğu için 8 durum gerektirir.
        </p>
        <p>NFA'lar özellikle birleşim, art arda ekleme ve yıldız işlemlerinin ispatında kullanışlıdır (Hafta 3).</p>
      </Card>
    </div>
  )
}

export function Week4({ go }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Biçimsel tanım">
        <p>
          <Tex>R</Tex> bir <Term tr="düzenli ifadedir" en="regular expression" /> eğer şunlardan biriyse:
        </p>
        <Tex block>{m`R \in \{\ a\ (a\in\Sigma),\ \ \varepsilon,\ \ \varnothing,\ \ R_1 \cup R_2,\ \ R_1 R_2,\ \ R_1^{*}\ \}`}</Tex>
        <p>
          Öncelik: önce yıldız, sonra art arda ekleme, en son birleşim. Kısaltma: <Tex>{m`R^{+} = RR^{*}`}</Tex> (en az bir kez), <Tex>{m`\Sigma`}</Tex> herhangi bir sembol.
        </p>
        <Tex block>{m`ab^{*} \cup c \;=\; \big(a(b^{*})\big) \cup c`}</Tex>
      </Card>
      <Card title="Yararlı eşitlikler" tone="note">
        <Table
          head={['Eşitlik', 'Açıklama']}
          rows={[
            [<Tex key="1">{m`R \cup \varnothing = R`}</Tex>, 'boş dil birleşimin birim öğesi'],
            [<Tex key="2">{m`R\varepsilon = R`}</Tex>, 'ε art arda eklemenin birim öğesi'],
            [<Tex key="3">{m`R\varnothing = \varnothing`}</Tex>, '∅ ile art arda ekleme boş verir'],
            [<Tex key="4">{m`\varnothing^{*} = \{\varepsilon\}`}</Tex>, 'boş dilin yıldızı yalnızca ε'],
            [<Tex key="5">{m`(R^{*})^{*} = R^{*}`}</Tex>, 'yıldız iki kez uygulanmaz'],
            [<Tex key="6">{m`(a \cup b)^{*} = (a^{*}b^{*})^{*}`}</Tex>, 'iki farklı yazılış, aynı dil'],
          ]}
        />
      </Card>
      <Card title="Düzenli ifade ⇔ düzenli dil" tone="note">
        <p>
          <b>Teorem:</b> bir dil ancak ve ancak bir düzenli ifadeyle betimlenebiliyorsa düzenlidir.
        </p>
        <Steps
          items={[
            'İfade → NFA: her temel parça için küçük bir NFA kurulur; ∪, art arda ekleme ve * için NFA\'lar ε-geçişleriyle birleştirilir.',
            'DFA → ifade: genelleştirilmiş NFA (GNFA) kurulur, durumlar teker teker elenir; elenen durumun üzerinden geçen yollar düzenli ifade etiketleriyle birleştirilir.',
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <TryIt label="DFA → düzenli ifade (Dönüşümler)" onClick={() => go('convert')} />
          <TryIt label="İfadelerle dil kur (Dil İşlemleri)" onClick={() => go('algebra')} />
        </div>
      </Card>
      <Card title="Çözümlü örnekler" tone="example">
        <Table
          head={['Dil (Σ = {0,1})', 'Düzenli ifade']}
          rows={[
            ['00 içeren dizeler', <Tex key="a">{m`\Sigma^{*}00\,\Sigma^{*}`}</Tex>],
            ['1 ile başlayıp 0 ile biten', <Tex key="b">{m`1\Sigma^{*}0`}</Tex>],
            ['uzunluğu çift', <Tex key="c">{m`(\Sigma\Sigma)^{*}`}</Tex>],
            ['11 içermeyen', <Tex key="d">{m`(0 \cup 10)^{*}(\varepsilon \cup 1)`}</Tex>],
            ['en az iki 1 içeren', <Tex key="e">{m`0^{*}10^{*}1\Sigma^{*}`}</Tex>],
          ]}
        />
      </Card>
    </div>
  )
}

export function Week7({ go }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Grameri sadeleştirme (7.1)">
        <Steps
          items={[
            <><Term tr="Gereksiz semboller" en="useless symbols" />: hiçbir terminal dize türetemeyen ya da başlangıçtan ulaşılamayan değişkenler ve onları içeren kurallar silinir.</>,
            <><Term tr="ε-kuralları" en="ε-productions" />: <Tex>{m`A \Rightarrow^{*} \varepsilon`}</Tex> olan (sıfırlanabilir) her değişken için, onu içeren her kuralın o değişkenli ve değişkensiz tüm sürümleri eklenir; <Tex>{m`A \to \varepsilon`}</Tex> kuralları silinir.</>,
            <><Term tr="Birim kurallar" en="unit productions" />: <Tex>{m`A \to B`}</Tex> silinir; <Tex>{m`A \Rightarrow^{*} B`}</Tex> ise <Tex>B</Tex>'nin birim olmayan tüm kuralları <Tex>A</Tex>'ya kopyalanır.</>,
          ]}
        />
      </Card>
      <Card title="Chomsky normal formu (7.2)" tone="note">
        <p>Her kural şu biçimlerden biridir (B ve C başlangıç değişkeni olamaz):</p>
        <Tex block>{m`A \to BC \qquad A \to a \qquad S \to \varepsilon\ (\text{yalnızca } \varepsilon \in L \text{ ise})`}</Tex>
        <Steps
          items={[
            <>Yeni başlangıç <Tex>{m`S_0 \to S`}</Tex>.</>,
            'ε-kurallarını, sonra birim kuralları kaldır; gereksizleri temizle.',
            <>Uzun kurallardaki terminaller için <Tex>{m`U_a \to a`}</Tex> ekle.</>,
            <><Tex>{m`A \to X_1X_2\cdots X_k`}</Tex> kurallarını <Tex>{m`A \to X_1A_1,\ A_1 \to X_2A_2, \dots`}</Tex> zincirine böl.</>,
          ]}
        />
        <p>
          CNF'de <Tex>{m`|w| = n \geq 1`}</Tex> uzunluğundaki her dize tam <Tex>{m`2n-1`}</Tex> adımda türetilir; bu, CYK algoritmasının temelidir.
        </p>
        <TryIt label="Gramer sekmesinde adım adım CNF" onClick={() => go('cfg')} />
      </Card>
      <Card title="Düzenli gramerler (7.3)">
        <p>Tüm kuralları şu biçimde olan gramere düzenli gramer denir:</p>
        <Tex block>{m`A \to aB \qquad A \to a \qquad A \to \varepsilon`}</Tex>
        <p>
          <b>Teorem:</b> bir dil ancak ve ancak bir düzenli gramerle üretilebiliyorsa düzenlidir. İspat fikri: her değişken bir NFA durumudur; <Tex>{m`A \to aB`}</Tex> bir{' '}
          <Tex>{m`A \xrightarrow{a} B`}</Tex> geçişidir; <Tex>{m`A \to a`}</Tex> ve <Tex>{m`A \to \varepsilon`}</Tex> tek bir ek kabul durumuna gider.
        </p>
        <TryIt label="Düzenli gramer ↔ NFA dönüştür" onClick={() => go('cfg')} />
      </Card>
      <Card title="Çözümlü örnek (Kitap Örnek 7-10)" tone="example">
        <p>
          <Tex>{m`(a \cup bab)\,c^{+}(b \cup c)^{*}`}</Tex> dilini üreten düzenli gramer:
        </p>
        <Tex block>{m`\begin{aligned} S &\to aA \mid bB & A &\to cA \mid cD & B &\to aC \\ C &\to bA & D &\to bD \mid cD \mid \varepsilon \end{aligned}`}</Tex>
        <p>
          <Tex>B, C</Tex> değişkenleri <i>bab</i>'ın ortasını, <Tex>A</Tex> en az bir <i>c</i>'yi, <Tex>D</Tex> sondaki <Tex>{m`(b\cup c)^{*}`}</Tex> kısmını üretir.
        </p>
      </Card>
    </div>
  )
}

export function Week10({ go }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Turing makinesinin tanımı (10.1)">
        <Tex block>{m`M = (Q,\ \Sigma,\ \Gamma,\ \delta,\ q_0,\ q_{\text{kabul}},\ q_{\text{red}}), \quad \delta : Q \times \Gamma \to Q \times \Gamma \times \{L, R\}`}</Tex>
        <p>
          Sonsuz bir <Term tr="şerit" en="tape" /> üzerinde okuma/yazma kafası her adımda bir sembol okur, yerine yazar ve sola ya da sağa gider. Şerit alfabesi <Tex>\Gamma</Tex>{' '}
          girdi alfabesini ve <Term tr="boşluk" en="blank" /> sembolünü <Tex>{m`\sqcup`}</Tex> içerir. Makine kabul ya da red durumuna girince durur; hiç durmayabilir de.
        </p>
        <TryIt label="Turing Makinesi sekmesinde izle" onClick={() => go('tm')} />
      </Card>
      <Card title="Algoritmik betimleme (10.2)" tone="example">
        <p>
          <Tex>{m`\{a^nb^nc^n \mid n \geq 0\}`}</Tex> için yüksek düzeyde:
        </p>
        <Steps
          items={[
            'Şeridi tara; ilk işaretsiz a\'yı X ile işaretle.',
            'Sağa git, ilk işaretsiz b\'yi Y, sonra ilk işaretsiz c\'yi Z ile işaretle; bulamazsan reddet.',
            'Başa dön ve tekrarla. Hiç işaretsiz a kalmadığında işaretsiz b ya da c varsa reddet, yoksa kabul et.',
          ]}
        />
      </Card>
      <Card title="Varyantlar ve Church–Turing tezi (11.1–11.2)" tone="note">
        <p>
          Çok şeritli TM, deterministik olmayan TM ve "yerinde kal" (S) hareketli TM'ler standart TM ile <b>aynı gücü</b> taşır; yalnızca hızları farklıdır. Bir{' '}
          <Term tr="evrensel Turing makinesi" en="universal TM" /> <Tex>{m`U`}</Tex>, girdi olarak <Tex>{m`\langle M, w\rangle`}</Tex> alıp <Tex>M</Tex>'yi <Tex>w</Tex> üzerinde simüle eder.
        </p>
        <p>
          <b>Church–Turing tezi:</b> sezgisel olarak "algoritma" dediğimiz her şey bir Turing makinesiyle yapılabilir.
        </p>
      </Card>
      <Card title="Karar verilebilir diller (11.3–11.4)">
        <p>
          Her girdide duran ve doğru yanıtı veren bir TM varsa dil <Term tr="karar verilebilirdir" en="decidable" />; yalnızca kabul edilecek girdilerde durması garanti ise{' '}
          <Term tr="tanınabilirdir" en="recognizable" />.
        </p>
        <Table
          head={['Problem', 'Durum']}
          rows={[
            [<Tex key="a">{m`A_{\text{DFA}} = \{\langle B,w\rangle \mid B \text{ DFA},\ w \in L(B)\}`}</Tex>, 'karar verilebilir'],
            [<Tex key="b">{m`E_{\text{DFA}} = \{\langle A\rangle \mid L(A) = \varnothing\}`}</Tex>, 'karar verilebilir'],
            [<Tex key="c">{m`A_{\text{CFG}}`}</Tex>, 'karar verilebilir (CNF + CYK)'],
            [<Tex key="d">{m`A_{\text{TM}}`}</Tex>, 'tanınabilir ama karar verilemez'],
          ]}
        />
      </Card>
    </div>
  )
}

export function Week12() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Sayılamayan kümeler ve köşegenleştirme (12.1)">
        <p>
          Doğal sayılarla birebir eşlenebilen kümeler <Term tr="sayılabilir" en="countable" />dir: <Tex>{m`\mathbb{Z},\ \mathbb{Q},\ \Sigma^{*}`}</Tex> ve tüm Turing makinelerinin
          kümesi. Cantor'un <Term tr="köşegen yöntemi" en="diagonalization" /> <Tex>{m`\mathbb{R}`}</Tex>'nin ve tüm dillerin kümesi <Tex>{m`\mathcal{P}(\Sigma^{*})`}</Tex>'ın sayılamadığını gösterir.
        </p>
        <p>
          <b>Sonuç:</b> sayılabilir sayıda TM, sayılamayan sayıda dil vardır; dolayısıyla <b>hiçbir TM'nin tanıyamadığı diller vardır</b> (12.2).
        </p>
      </Card>
      <Card title="Kabul problemi karar verilemez (12.3)" tone="note">
        <Tex block>{m`A_{\text{TM}} = \{\langle M, w\rangle \mid M \text{ bir TM ve } M,\ w\text{'yu kabul eder}\}`}</Tex>
        <Steps
          items={[
            <><Tex>H</Tex>, <Tex>{m`A_{\text{TM}}`}</Tex>'ye karar veren bir TM olsun.</>,
            <><Tex>D</Tex> makinesini kur: <Tex>{m`\langle M\rangle`}</Tex> girdisinde <Tex>H</Tex>'yi <Tex>{m`\langle M, \langle M\rangle\rangle`}</Tex> üzerinde çalıştır, yanıtın <b>tersini</b> ver.</>,
            <><Tex>D</Tex>'yi kendi tanımı <Tex>{m`\langle D\rangle`}</Tex> üzerinde çalıştır: <Tex>D</Tex> kabul ederse reddetmeli, reddederse kabul etmelidir. Çelişki.</>,
          ]}
        />
        <p>
          <Tex>{m`\overline{A_{\text{TM}}}`}</Tex> tanınabilir bile değildir: bir dil ve tümleyeni tanınabilirse dil karar verilebilir olurdu.
        </p>
      </Card>
      <Card title="İndirgeme (12.4)">
        <p>
          <Tex>A</Tex>'yı çözmek <Tex>B</Tex>'yi çözmeye <Term tr="indirgenebiliyorsa" en="reducible" /> (<Tex>{m`A \leq_m B`}</Tex>), <Tex>B</Tex> karar verilebilir olduğunda{' '}
          <Tex>A</Tex> da olur. Tersine: <Tex>A</Tex> karar verilemezse <Tex>B</Tex> de karar verilemez.
        </p>
        <Tex block>{m`\text{HALT}_{\text{TM}} = \{\langle M, w\rangle \mid M,\ w \text{ üzerinde durur}\}`}</Tex>
        <p>
          <Tex>{m`A_{\text{TM}} \leq_m \text{HALT}_{\text{TM}}`}</Tex>: durma problemine karar veren bir makine olsaydı, önce <Tex>M</Tex>'nin durup durmadığını sorup durursa simüle
          ederek <Tex>{m`A_{\text{TM}}`}</Tex>'ye karar verirdik. Dolayısıyla durma problemi de karar verilemez.
        </p>
      </Card>
      <Card title="Özet" tone="example">
        <Table
          head={['Dil', 'Tanınabilir', 'Karar verilebilir']}
          rows={[
            [<Tex key="a">{m`A_{\text{DFA}},\ A_{\text{CFG}}`}</Tex>, '✓', '✓'],
            [<Tex key="b">{m`A_{\text{TM}},\ \text{HALT}_{\text{TM}}`}</Tex>, '✓', '✗'],
            [<Tex key="c">{m`\overline{A_{\text{TM}}}`}</Tex>, '✗', '✗'],
          ]}
        />
      </Card>
    </div>
  )
}

export function Week13() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Zaman karmaşıklığı (13.1)">
        <p>
          Bir TM'nin çalışma süresi <Tex>{m`f(n)`}</Tex>, <Tex>n</Tex> uzunluğundaki girdilerde attığı en fazla adım sayısıdır. Büyük-O gösterimi baskın terimi tutar:{' '}
          <Tex>{m`5n^3 + 2n^2 + 22 = O(n^3)`}</Tex>.
        </p>
        <p>
          Örnek: <Tex>{m`\{0^k1^k\}`}</Tex> tek şeritli TM ile <Tex>{m`O(n^2)`}</Tex>, iki şeritli TM ile <Tex>{m`O(n)`}</Tex> sürede çözülür. Model değişince süre değişebilir, ama
          deterministik modeller arasındaki fark en fazla polinomdur.
        </p>
      </Card>
      <Card title="P sınıfı (13.2)" tone="note">
        <Tex block>{m`\mathrm{P} = \bigcup_{k} \mathrm{TIME}(n^k)`}</Tex>
        <p>
          Deterministik bir TM ile polinom sürede karar verilebilen diller. "Verimli çözülebilir" problemlerin matematiksel karşılığıdır. Örnekler: PATH (graf üzerinde yol var mı),
          RELPRIME (iki sayı aralarında asal mı), her bağlamdan bağımsız dil.
        </p>
      </Card>
      <Card title="NP sınıfı (13.3)">
        <p>
          Bir dil NP'dedir eğer üyeliği polinom sürede <Term tr="doğrulanabiliyorsa" en="verifiable" />: "evet" yanıtı için kısa bir <Term tr="sertifika" en="certificate" /> verildiğinde
          kontrol hızlıdır. Eşdeğeri: deterministik olmayan TM ile polinom süre.
        </p>
        <Tex block>{m`\mathrm{P} \subseteq \mathrm{NP} \qquad \mathrm{P} \overset{?}{=} \mathrm{NP}`}</Tex>
        <p>Örnekler: HAMPATH (Hamilton yolu), CLIQUE (k-klik), SUBSET-SUM, SAT.</p>
      </Card>
      <Card title="NP-tamlık (14.1–14.3)" tone="note">
        <p>
          <Tex>{m`A \leq_p B`}</Tex>: <Tex>A</Tex>'nın örnekleri polinom sürede <Tex>B</Tex>'nin örneklerine dönüştürülebilir. <Tex>B</Tex>{' '}
          <Term tr="NP-tam" en="NP-complete" />dir eğer <Tex>{m`B \in \mathrm{NP}`}</Tex> ve her <Tex>{m`A \in \mathrm{NP}`}</Tex> için <Tex>{m`A \leq_p B`}</Tex>.
        </p>
        <Steps
          items={[
            <><b>Cook–Levin teoremi:</b> SAT NP-tamdır.</>,
            <>Zincir: <Tex>{m`\text{SAT} \leq_p \text{3SAT} \leq_p \text{CLIQUE},\ \text{3SAT} \leq_p \text{VERTEX-COVER} \leq_p \dots`}</Tex></>,
            'Herhangi bir NP-tam problem P\'de çözülürse P = NP olur.',
          ]}
        />
      </Card>
    </div>
  )
}
