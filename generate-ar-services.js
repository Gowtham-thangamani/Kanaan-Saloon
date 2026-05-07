// Generates 7 Arabic service detail pages
const fs = require('fs');
const path = require('path');

const services = [
  {
    slug: 'hair-beard',
    num: '٠١ / ٠٧',
    name_ar: 'الشعر واللحية',
    intro_ar: 'قصّات دقيقة. حلاقة كلاسيكية. عناية باللحية بأيدي محترفين.',
    img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=75',
    aboutHeading_ar: 'حيث يُمارَس الفنّ على الكرسي.',
    aboutBody_ar: 'كل قصّة في كنعان تبدأ باستشارة قصيرة — كيف ترتديها، شكل وجهك، وكم تتوفّر لديك من الوقت للحفاظ عليها. حلّاقونا مدرّبون على الأنماط الأوروبية والحديثة والعربية، ونحافظ على نفس المعيار من ترتيب سريع للرقبة إلى حلاقة كاملة بالمنشفة الساخنة.',
    treatments: [
      { name: 'قصّة شعر مميّزة', desc: 'استشارة، قصّ، غسل، تصفيف. ~٤٥ دقيقة.', price: 'ابتداءً من ٧٥ درهم' },
      { name: 'حلاقة كلاسيكية بالمنشفة الساخنة', desc: 'زيت قبل الحلاقة، شفرة مزدوجة، بلسم بعد الحلاقة.', price: 'ابتداءً من ٩٠ درهم' },
      { name: 'نحت لحية', desc: 'تشذيب، تحديد، عناية.', price: 'ابتداءً من ٦٠ درهم' },
      { name: 'الأب والابن', desc: 'قصّتان جنباً إلى جنب. ضيافة كاملة.', price: 'ابتداءً من ١٤٠ درهم' },
      { name: 'قصّة من الحلّاق الرئيسي (VIP)', desc: 'جناح خاص، حلّاق رئيسي. بحجز مسبق.', price: 'اطلب السعر' },
      { name: 'صبغة ومعالجة الشيب', desc: 'تغطية تدريجية أو كاملة.', price: 'احجز استشارة' }
    ],
    ritual: [
      { name: 'الاستشارة', body: 'محادثة قصيرة عن أسلوبك وما يناسبك.' },
      { name: 'التنفيذ', body: 'العمل نفسه، بدون عجلة، بأدوات صحيحة.' },
      { name: 'اللمسة الأخيرة', body: 'غسل، تصفيف، وملاحظات للحفاظ على النتيجة.' }
    ]
  },
  {
    slug: 'facial-skin-care',
    num: '٠٢ / ٠٧',
    name_ar: 'العناية بالبشرة',
    intro_ar: 'جلسات وجه مدروسة لبشرة الرجل — تنقية، ترطيب، استعادة.',
    img: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1583468982228-19f19164aee2?auto=format&fit=crop&w=1200&q=75',
    aboutHeading_ar: 'عناية بالبشرة، بدقّة.',
    aboutBody_ar: 'تبدأ جلساتنا بتقييم صادق — نوع البشرة، التعرّض للشمس، عادات الحلاقة، الترطيب. نستخدم منتجات احترافية فقط، وما تحتاجه بشرتك بالفعل. بدون إضافات، بدون مبالغة.',
    treatments: [
      { name: 'جلسة وجه سريعة', desc: 'تنظيف، تقشير، ترطيب. ~٣٠ دقيقة.', price: 'ابتداءً من ١٢٠ درهم' },
      { name: 'جلسة وجه مميّزة', desc: 'بروتوكول كامل مع استخراج وقناع. ~٦٠ دقيقة.', price: 'ابتداءً من ٢٥٠ درهم' },
      { name: 'هايدرا فيشل', desc: 'تنظيف عميق وترطيب متعدّد المراحل.', price: 'ابتداءً من ٣٨٠ درهم' },
      { name: 'جلسة مضادة للإرهاق', desc: 'لرافعي الحقائب وأصحاب التوتر العالي.', price: 'ابتداءً من ٢٨٠ درهم' },
      { name: 'بشرة حبّ الشباب', desc: 'علاج مستهدف باستشارة.', price: 'احجز استشارة' },
      { name: 'مكافحة الشيخوخة الفاخرة', desc: 'بروتوكول من المستوى الأعلى.', price: 'اطلب السعر' }
    ],
    ritual: [
      { name: 'الاستشارة', body: 'تقييم بشرة قصير ومراجعة لروتينك.' },
      { name: 'العلاج', body: 'البروتوكول نفسه في غرفة هادئة.' },
      { name: 'الروتين', body: 'روتين منزلي بسيط لاستدامة النتيجة.' }
    ]
  },
  {
    slug: 'massage',
    num: '٠٣ / ٠٧',
    name_ar: 'المساج',
    intro_ar: 'جلسات مساج عميقة، استرخاء، واستشفاء على يد معالجين مدرّبين.',
    img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=75',
    aboutHeading_ar: 'الضغط، الحضور، والصبر.',
    aboutBody_ar: 'معالجونا مدرّبون على المساج السويدي الكلاسيكي والعميق والاستشفاء الرياضي. الجلسات خاصّة وهادئة — بدون عجلة. الضغط مُعَيَّر لك أنت، وليس لقالب جاهز.',
    treatments: [
      { name: 'مساج سويدي للاسترخاء', desc: 'ضغط خفيف إلى متوسّط للجسم كاملاً.', price: 'ابتداءً من ٢٢٠ درهم · ٦٠ دقيقة' },
      { name: 'مساج عميق', desc: 'علاج مستهدف لتوتر مزمن.', price: 'ابتداءً من ٢٨٠ درهم · ٦٠ دقيقة' },
      { name: 'استشفاء رياضي', desc: 'استعادة عضلية بعد التدريب.', price: 'ابتداءً من ٢٨٠ درهم · ٦٠ دقيقة' },
      { name: 'الرأس والرقبة والكتفين', desc: 'تخفيف توتر سريع.', price: 'ابتداءً من ١٥٠ درهم · ٣٠ دقيقة' },
      { name: 'الحجارة الساخنة', desc: 'حجارة بازلت ساخنة لتسخين عميق.', price: 'ابتداءً من ٣٢٠ درهم · ٧٥ دقيقة' },
      { name: 'مساج زوجي / VIP', desc: 'معالجان، جناح واحد. بحجز مسبق.', price: 'اطلب السعر' }
    ],
    ritual: [
      { name: 'التقييم', body: 'محادثة قصيرة — الضغط، المناطق، ما يجب تجنّبه.' },
      { name: 'الجلسة', body: 'العمل في غرفة هادئة معايرة لك.' },
      { name: 'التعافي', body: 'ماء، وقت، وملاحظات لتمارين منزلية.' }
    ]
  },
  {
    slug: 'moroccan-bath',
    num: '٠٤ / ٠٧',
    name_ar: 'الحمّام المغربي',
    intro_ar: 'طقس حمّام مغربي أصيل — تقشير، بخار، وانتعاش.',
    img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1583416750470-965b2707b355?auto=format&fit=crop&w=1200&q=75',
    aboutHeading_ar: 'طقس عريق،<br/>يُؤدَّى كما يجب.',
    aboutBody_ar: 'الحمّام المغربي من أعرق طقوس العناية في المنطقة. نُؤدّيه كما يجب أن يُؤدَّى — صابون أسود، بخار، تقشير بكيس الكسة، قناع، وانتهاء بزيت الأرجان. متوفّر في بيوت السبا (بنياس سبا، VIP المرور).',
    treatments: [
      { name: 'الحمّام المغربي الكلاسيكي', desc: 'بخار، صابون أسود، تقشير كامل، قناع مرطّب.', price: 'ابتداءً من ١٨٠ درهم' },
      { name: 'الطقس المغربي الملكي', desc: 'الكلاسيكي + علاج بزيت أرجان ومساج رأس.', price: 'ابتداءً من ٢٨٠ درهم' },
      { name: 'حمّام زوجي', desc: 'جنباً إلى جنب في جناح خاص. بحجز مسبق.', price: 'اطلب السعر' },
      { name: 'حمّام سريع', desc: 'نسخة مختصرة لزوّار الوقت المحدود.', price: 'ابتداءً من ١٣٠ درهم' }
    ],
    ritual: [
      { name: 'البخار', body: '١٢–١٥ دقيقة في الحمّام لفتح المسام.' },
      { name: 'التنظيف والتقشير', body: 'صابون أسود وكيس كسة — قلب الطقس.' },
      { name: 'الانتعاش', body: 'قناع مرطّب وزيت أرجان — انتعاش كامل.' }
    ]
  },
  {
    slug: 'manicure-pedicure',
    num: '٠٥ / ٠٧',
    name_ar: 'العناية بالأظافر',
    intro_ar: 'عناية باليدين والقدمين بدقّة عالية وأدوات معقّمة.',
    img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=1200&q=75',
    aboutHeading_ar: 'عناية باليدين والقدمين<br/>كما يجب.',
    aboutBody_ar: 'غرف العناية بالأظافر في كنعان تخضع لنفس معيار النظافة في باقي البيت — أدوات لمرة واحدة، عبوات مغلقة، بدون اختصار. العمل هادئ، دقيق، ويناسب الانتقال بين اجتماعاتك.',
    treatments: [
      { name: 'مانيكير للرجال', desc: 'تشذيب، تشكيل، عناية بالجلد، تلميع.', price: 'ابتداءً من ٧٠ درهم' },
      { name: 'بيديكير للرجال', desc: 'نقع، تشذيب، تشكيل، إزالة كالس، ترطيب.', price: 'ابتداءً من ١٠٠ درهم' },
      { name: 'مانيكير + بيديكير', desc: 'الاثنان في زيارة واحدة.', price: 'ابتداءً من ١٥٠ درهم' },
      { name: 'بيديكير فاخر', desc: 'علاج مكثّف للكالس ومساج للقدمين.', price: 'ابتداءً من ١٦٠ درهم' },
      { name: 'العناية بالأظافر الناشبة', desc: 'عناية متخصّصة. استشارة أولاً.', price: 'احجز استشارة' }
    ],
    ritual: [
      { name: 'النقع', body: 'نقع دافئ بأملاح معدنية لتليين البشرة.' },
      { name: 'العناية', body: 'تشذيب، تشكيل، وعناية بأدوات معقّمة.' },
      { name: 'اللمسة الأخيرة', body: 'كريم مرطّب، مساج خفيف، ولمسة نظيفة.' }
    ]
  },
  {
    slug: 'hair-treatment',
    num: '٠٦ / ٠٧',
    name_ar: 'علاجات الشعر',
    intro_ar: 'علاجات بروتين، كيراتين، وفروة رأس لشعر أكثر صحّة وقوّة.',
    img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=75',
    aboutHeading_ar: 'شعر مُستَعاد.',
    aboutBody_ar: 'قائمة علاجات الشعر عندنا تعالج المشاكل التي يواجهها معظم الرجال ولا يتحدّثون عنها — الجفاف، التقصّف، فقدان الكثافة عند الصدغين، تهيّج فروة الرأس. منتجاتنا احترافية وفريقنا سيخبرك بصدق ما الذي يناسبك وما لا يستحق.',
    treatments: [
      { name: 'علاج بروتين', desc: 'لشعر تالف أو مصبوغ.', price: 'ابتداءً من ١٨٠ درهم' },
      { name: 'كيراتين', desc: 'بروتوكول تنعيم طويل الأمد.', price: 'ابتداءً من ٦٠٠ درهم' },
      { name: 'علاج فروة الرأس', desc: 'تنظيف، تقشير، وتنشيط فروة.', price: 'ابتداءً من ٢٢٠ درهم' },
      { name: 'استشارة تساقط الشعر', desc: 'تقييم صادق وتوصيات.', price: 'احجز استشارة' },
      { name: 'بوتوكس الشعر الفاخر', desc: 'إنعاش شعر من المستوى الأعلى.', price: 'اطلب السعر' },
      { name: 'صبغة ومعالجة شيب', desc: 'تغطية تدريجية أو كاملة.', price: 'احجز استشارة' }
    ],
    ritual: [
      { name: 'التشخيص', body: 'تقييم شعر وفروة رأس قصير.' },
      { name: 'العلاج', body: 'البروتوكول، بدون مبالغة في الوقت.' },
      { name: 'الصيانة', body: 'ملخّص لما تستخدمه في المنزل.' }
    ]
  },
  {
    slug: 'grooming-packages',
    num: '٠٧ / ٠٧',
    name_ar: 'باقات العناية',
    intro_ar: 'باقات عناية مختارة تجمع أكثر من خدمة — أفضل قيمة، تجربة كاملة.',
    img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2000&q=75',
    splitImg: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=75',
    aboutHeading_ar: 'إعادة ضبط كاملة.',
    aboutBody_ar: 'باقاتنا تجمع الخدمات الأكثر طلباً في زيارة واحدة منظّمة — مثالية لمن يريد العناية الكاملة في جلسة واحدة، أو يبحث عن أكثر طريقة كفاءة للظهور بأفضل صورة قبل اجتماع مهم أو رحلة طويلة.',
    treatments: [
      { name: 'باقة ٨ خدمات مميّزة', desc: 'قصّة، نحت لحية، غسل وعلاج شعر، جلسة وجه، مساج رأس، أظافر.', price: '٢٥٠ درهم' },
      { name: 'باقة ٦ خدمات', desc: 'قصّة، تشذيب لحية، غسل، جلسة وجه، عناية يدين وقدمين.', price: '١٠٠ درهم' },
      { name: 'باقة العيد المميّزة', desc: 'قصّة ونحت لحية، حمّام مغربي، جلسة وجه فاخرة، أظافر. لفترة محدودة.', price: '٣٢٠ درهم' },
      { name: 'ساعة الـ VIP', desc: 'جناح خاص، قصّة على يد حلّاق رئيسي، حلاقة بالمنشفة الساخنة، جلسة وجه، ضيافة.', price: '٤٥٠ درهم' },
      { name: 'طقس الأب والابن', desc: 'قصّتان، تشذيب لحيتين، غسل، ضيافة.', price: '٢٢٠ درهم' },
      { name: 'باقة مخصّصة', desc: 'صمّم باقتك بنفسك — تواصل معنا.', price: 'اطلب السعر' }
    ],
    ritual: [
      { name: 'اختر', body: 'باقة جاهزة أو طلب تخصيص.' },
      { name: 'احجز', body: 'إلكترونياً أو عبر واتساب.' },
      { name: 'استرخِ', body: 'زيارة واحدة كاملة.' }
    ]
  }
];

const tpl = (s) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${s.name_ar} | كنعان صالون وسبا للرجال</title>
  <meta name="description" content="${s.intro_ar} متوفّرة عبر بيوت كنعان في أبوظبي والعين." />
  <link rel="canonical" href="/ar/services/${s.slug}.html" />
  <link rel="alternate" hreflang="en" href="/services/${s.slug}.html" />
  <link rel="alternate" hreflang="ar" href="/ar/services/${s.slug}.html" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../assets/css/style.css" />
</head>
<body class="lang-ar">

  <header class="site-header">
    <div class="site-header__inner">
      <a href="../index.html" class="logo">KANAAN<span>.</span></a>
      <nav class="main-nav">
        <a href="../index.html">الرئيسية</a>
        <a href="../about.html">عن كنعان</a>
        <a href="../services.html" class="is-active">الخدمات</a>
        <a href="../offers.html">العروض</a>
        <a href="../branches.html">الفروع</a>
        <a href="../gallery.html">المعرض</a>
        <a href="../contact.html">تواصل</a>
      </nav>
      <div class="header-actions">
        <a href="../../services/${s.slug}.html" class="lang-switch">EN</a>
        <a href="../book.html?service=${s.slug}" class="btn btn--sm">احجز الآن</a>
        <button class="menu-toggle" aria-label="القائمة"><span></span><span></span><span></span></button>
      </div>
    </div>
    <nav class="mobile-nav">
      <a href="../index.html">الرئيسية</a><a href="../services.html">الخدمات</a>
      <a href="../offers.html">العروض</a><a href="../branches.html">الفروع</a>
      <a href="../contact.html">تواصل</a><a href="../../services/${s.slug}.html">EN</a>
      <a href="../book.html?service=${s.slug}" class="btn">احجز الآن</a>
    </nav>
  </header>

  <section class="page-hero">
    <div class="page-hero__media"><img src="${s.img}" alt="" /></div>
    <div class="container page-hero__content">
      <div class="breadcrumb">
        <a href="../index.html">الرئيسية</a><span class="sep">/</span>
        <a href="../services.html">الخدمات</a><span class="sep">/</span>
        <span>${s.name_ar}</span>
      </div>
      <span class="eyebrow">فئة ${s.num}</span>
      <h1 class="page-hero__title">${s.name_ar}</h1>
      <p class="lede" style="color: var(--c-pearl); margin-top: var(--s-4);">${s.intro_ar}</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="split">
        <div>
          <span class="eyebrow">عن هذه الفئة</span>
          <h2 class="display-2">${s.aboutHeading_ar}</h2>
          <div class="divider"></div>
          <p class="muted">${s.aboutBody_ar}</p>
        </div>
        <div class="split__media"><img src="${s.splitImg}" alt="" /></div>
      </div>
    </div>
  </section>

  <section class="section section--light">
    <div class="container">
      <div class="section-head section-head--left">
        <span class="eyebrow">العلاجات</span>
        <h2 class="section-head__title display-2">في هذه الفئة.</h2>
      </div>
      <div style="border-top: 1px solid var(--hairline);">
        ${s.treatments.map(t => `
        <div style="display:grid; grid-template-columns: 1.5fr 2fr 1fr auto; gap: var(--s-5); padding: var(--s-5) 0; border-bottom: 1px solid var(--hairline); align-items:center;">
          <h3 style="font-size: 22px;">${t.name}</h3>
          <p class="muted" style="margin:0;">${t.desc}</p>
          <span class="text-gold" style="font-family: var(--f-display); font-size: 22px;">${t.price}</span>
          <a href="${t.price.includes('استشارة') || t.price.includes('اطلب') ? 'https://wa.me/971505556795' : `../book.html?service=${s.slug}`}" class="btn btn--sm">${t.price.includes('استشارة') || t.price.includes('اطلب') ? 'استفسر' : 'احجز'}</a>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head">
        <span class="eyebrow">الطقس</span>
        <h2 class="section-head__title display-2">ثلاث خطوات، في كل مرّة.</h2>
      </div>
      <div class="grid grid-3">
        ${s.ritual.map((r, i) => `
        <div>
          <span class="eyebrow">الخطوة ٠${i + 1}</span>
          <h3 style="font-size: 28px; margin-top:var(--s-3);">${r.name}</h3>
          <p class="muted">${r.body}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="cta-band">
    <h2 class="cta-band__title">احجز كرسيك.</h2>
    <p class="cta-band__sub">اختر الفرع والوقت — التأكيد خلال دقائق.</p>
    <a href="../book.html?service=${s.slug}" class="btn btn--lg">احجز الآن</a>
  </section>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <span>© ٢٠٢٦ كنعان صالون وسبا للرجال.</span>
        <div class="footer-bottom__links"><a href="../../privacy-policy.html">الخصوصية</a><a href="../../terms.html">الشروط</a><a href="../../services/${s.slug}.html">EN</a></div>
      </div>
    </div>
  </footer>

  <div class="mobile-cta">
    <a href="../book.html?service=${s.slug}" class="mobile-cta__book">احجز الآن</a>
    <a href="https://wa.me/971505556795" aria-label="واتساب"><span class="mobile-cta__icon">✉</span></a>
    <a href="tel:+971505556795" aria-label="اتصال"><span class="mobile-cta__icon">☏</span></a>
  </div>

  <script src="../../assets/js/config.js"></script>
  <script src="../../assets/js/tracking.js"></script>
  <script src="../../assets/js/consent.js" defer></script>
  <script src="../../assets/js/main.js"></script>
</body>
</html>
`;

const outDir = path.join(__dirname, 'ar', 'services');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
services.forEach(s => {
  fs.writeFileSync(path.join(outDir, s.slug + '.html'), tpl(s));
  console.log('wrote', 'ar/services/' + s.slug + '.html');
});
console.log(`\nGenerated ${services.length} Arabic service detail pages.`);
