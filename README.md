# 🏍️ REXMOTO — متجر الدراجات والسكوترات الكهربائية

موقع متجر احترافي متكامل: **واجهة متجر + لوحة إدارة محمية + قاعدة بيانات سحابية + طلبات حقيقية + تقييمات بموافقة المدير + رفع صور متعددة + عروض وخصومات**.

- ✅ **Frontend:** HTML / CSS / JavaScript (بدون إطار عمل — سريع جداً)
- ✅ **Backend:** Firebase (Firestore + Auth + Storage)
- ✅ **Functions:** Netlify Functions (للتحقق الإضافي للطلبات والتقييمات)
- ✅ **النشر:** Netlify
- ✅ **اللغة:** عربي (RTL) + تصميم داكن Premium
- ✅ **متجاوب:** 320px حتى Desktop
- ✅ **PWA** قابل للتثبيت على الهاتف

---

## 📁 بنية المشروع

```
rexmoto/
├── index.html                    الصفحة الرئيسية
├── products.html                 قائمة المنتجات + بحث + فلاتر
├── product.html                  تفاصيل منتج ديناميكية
├── 404.html                      صفحة الخطأ
├── manifest.webmanifest          إعدادات PWA
├── robots.txt
├── sitemap.xml
├── netlify.toml                  قواعد الأمان والـ Headers
├── package.json
├── admin/
│   ├── index.html                لوحة الإدارة
│   └── login.html                تسجيل الدخول
├── pages/
│   └── privacy.html              سياسة الخصوصية
├── assets/
│   ├── css/
│   │   ├── style.css             أنماط المتجر
│   │   └── admin.css             أنماط لوحة الإدارة
│   └── js/
│       ├── config.js             ⚙️ إعدادات Firebase (عدّل هذا الملف)
│       ├── firebase.js           تهيئة Firebase
│       ├── app.js                منطق المتجر
│       └── admin.js              منطق لوحة الإدارة
├── netlify/functions/
│   ├── submit-order.js           Function حفظ الطلب
│   └── submit-testimonial.js     Function حفظ التقييم
├── firebase/
│   ├── firebase.json             إعدادات Firebase
│   ├── firestore.rules           قواعد أمان Firestore
│   ├── firestore.indexes.json    الفهارس
│   └── storage.rules             قواعد أمان التخزين
└── public/images/                الصور الثابتة
```

---

## 🚀 خطوات الإعداد (مرة واحدة فقط)

### 1) إنشاء مشروع Firebase

1. ادخل إلى [Firebase Console](https://console.firebase.google.com/).
2. اضغط **Add project** وسمّه `rexmoto`.
3. عطّل Google Analytics (لسنا بحاجته).
4. انتظر حتى يُنشأ المشروع.

### 2) تفعيل Firestore Database

1. من القائمة اليسرى: **Build → Firestore Database**.
2. اضغط **Create database**.
3. اختر **Start in production mode** (سنضيف قواعد الأمان لاحقاً).
4. اختر أقرب سيرفر (أوروبا مثلاً `eur3`).

### 3) تفعيل Storage (لصور المنتجات)

1. من القائمة: **Build → Storage**.
2. اضغط **Get started** ثم **Next** ثم **Done**.

### 4) تفعيل Authentication

1. من القائمة: **Build → Authentication**.
2. اضغط **Get started**.
3. من تبويب **Sign-in method** فعّل **Email/Password**.

### 5) الحصول على إعدادات الويب

1. في صفحة المشروع الرئيسية، اضغط أيقونة **Web** (`</>`).
2. سجّل اسم التطبيق `rexmoto-web`.
3. انسخ القيم التي تظهر (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
4. افتح الملف `assets/js/config.js` واستبدل القيم:

```js
window.REXMOTO_CONFIG = {
  firebase: {
    apiKey: "AIza...",
    authDomain: "rexmoto-xxxxx.firebaseapp.com",
    projectId: "rexmoto-xxxxx",
    storageBucket: "rexmoto-xxxxx.firebasestorage.app",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abc123..."
  },
  apiBase: "/.netlify/functions",
  storeName: "REXMOTO",
  whatsappDefault: "213550000000"
};
```

> 🔓 **ملاحظة أمان:** قيمة `apiKey` في تطبيقات الويب ليست سرّية — الأمان الحقيقي يأتي من قواعد Firestore وStorage. المفتاح السري (Service Account) يُخزَّن فقط في Netlify.

### 6) إنشاء حساب المدير

1. من Firebase Console: **Authentication → Users → Add user**.
2. أدخل بريداً إلكترونياً (مثل `admin@rexmoto.com`) وكلمة مرور قوية.
3. انسخ **UID** المستخدم (يظهر بجانب البريد).
4. اذهب إلى **Firestore Database → Start collection**:
   - اسم الـ Collection: `admins`
   - Document ID: الصق الـ UID
   - الحقول:
     ```
     name: "اسم المدير" (string)
     role: "admin" (string)
     createdAt: اتركها تلقائياً
     ```
5. احفظ. الآن يمكنك الدخول بهذا الحساب إلى `/admin/`.

### 7) رفع قواعد الأمان

1. من Firebase Console: **Firestore Database → Rules**.
2. انسخ محتوى ملف `firebase/firestore.rules`.
3. الصقه في المحرر واضغط **Publish**.

> 💡 ملاحظة: مش محتاجين `storage.rules` لأن الصور بتتخزن في Firestore (مفيش Storage).

### 8) نشر الفهارس (اختياري لكن موصى به)

من Firebase Console: **Firestore → Indexes** أنشئ الفهارس الموجودة في `firebase/firestore.indexes.json` يدوياً، أو استخدم Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:indexes
```

---

## 🌐 النشر على Netlify

### 1) ارفع المشروع على GitHub

- ادفع كل الملفات إلى repo جديد.

### 2) اربط Netlify

1. سجّل دخول على [netlify.com](https://netlify.com/).
2. **Add new site → Import an existing project → GitHub**.
3. اختر الـ repo.
4. Build settings:
   - **Build command:** اتركها فارغة
   - **Publish directory:** `.` (نقطة)
5. اضغط **Deploy**.

### 3) أضف متغيرات البيئة (Environment Variables)

في Netlify: **Site settings → Environment variables** أضف:

| المفتاح | القيمة |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | ملف Service Account كامل كـ JSON (انظر أدناه) |

#### كيف تحصل على Service Account:
1. Firebase Console → **Project Settings → Service accounts**.
2. اضغط **Generate new private key**.
3. حمّل الملف JSON.
4. افتحه وانسخ محتواه بالكامل.
5. الصقه كقيمة للمتغير `FIREBASE_SERVICE_ACCOUNT`.

> 🔒 **لا تشارك هذا الملف ولا ترفعه إلى GitHub أبداً**.

### 4) إعادة النشر

بعد إضافة المتغيرات: **Deploys → Trigger deploy → Deploy site**.

---

## 🧪 اختبار الموقع محلياً

```bash
# ثبّت Netlify CLI
npm install -g netlify-cli

# ثبّت الحزم
npm install

# شغّل بيئة التطوير
netlify dev
```

سيفتح الموقع على `http://localhost:8888` مع عمل الـ Functions محلياً.

---

## 📲 ما يراه المدير في لوحة الإدارة

ادخل على `your-site.netlify.app/admin/`:

1. **الرئيسية**: إحصائيات الطلبات، قيمة المبيعات، تنبيهات المخزون، مخطط 7 أيام، أحدث الطلبات.
2. **الطلبات**: كل الطلبات مع البحث والفلترة، تغيير الحالة (جديد ← تم التواصل ← مؤكد ← تم التسليم / ملغى)، زر واتساب مباشر للعميل، تفاصيل كاملة.
3. **المنتجات**:
   - إضافة منتج جديد بكل المواصفات (اسم، ماركة، فئة، سعر، سعر قديم، مخزون، سرعة، مدى، محرك، بطارية، ألوان، ضمان، وصف).
   - **رفع عدة صور** بسحب وإفلات.
   - تعديل وحذف.
   - تعيين منتج مميز.
   - عروض مع تاريخ انتهاء.
4. **التقييمات**:
   - عرض التقييمات المعلقة.
   - قبول (ينشر في الموقع) أو رفض أو حذف.
5. **الإعدادات**:
   - اسم المتجر، الهاتف، الواتساب.
   - العنوان، رابط الخريطة، أوقات العمل.
   - فيسبوك/إنستغرام.
   - عنوان SEO والوصف.
   - لون الأكسان.

---

## 🛡️ ملاحظات الأمان (بصدق)

ما تم تطبيقه:
- ✅ قواعد Firestore تمنع الزائر من قراءة الطلبات أو تعديلها.
- ✅ الزائر يستطيع فقط **إنشاء** طلب/تقييم — لا قراءة طلبات الآخرين.
- ✅ المدير فقط يستطيع القراءة/التعديل (مصادَق عليه).
- ✅ Service Account في Netlify Function للتحقق الإضافي (السعر يُجلب من DB، لا من العميل).
- ✅ Honeypot لمكافحة السبام.
- ✅ التحقق من المدخلات (طول، نمط، حدود).
- ✅ Security Headers كاملة (CSP, HSTS, X-Frame-Options...).
- ✅ كلمة مرور المدير تُدار من Firebase Auth.

ما **لا** يضمنه أي نظام:
- ⚠️ لا حماية 100% — أي موقع معرّض لمحاولات، لكن الإجراءات المذكورة كافية لمتجر محلي.
- ⚠️ ننصح بتفعيل قيود إضافية لاحقاً (معدل طلبات من Firebase App Check) إذا تطلب الأمر.

---

## 🔍 ربط Google Search Console

1. ادخل على [search.google.com/search-console](https://search.google.com/search-console).
2. أضف موقعك برابط Netlify.
3. اختر طريقة الإثبات (HTML tag أو Google Analytics).
4. ضع الـ meta tag في `<head>` في `index.html` (أو اربط Firebase Hosting).
5. اضغط **Verify**.
6. من القائمة اليسرى: **Sitemaps → أدخل `sitemap.xml` → Submit**.
7. اطلب فهرسة الصفحات من خلال **URL Inspection**.

> ⏳ ظهور النتائج قد يستغرق أياماً إلى أسابيع. لا أحد يضمن المرتبة الأولى.

---

## 🎨 تخصيص سريع

| ما تريد تغييره | الملف |
|---|---|
| لون الموقع | من الإدارة → إعدادات → لون الأكسان |
| اسم/هاتف/واتساب المحل | من الإدارة → إعدادات |
| إضافة منتج | الإدارة → منتجات → + جديد |
| تغيير صورة الـ Hero | ارفع صورة منتج وميزه (Featured) |
| تغيير النصوص | `assets/js/app.js` (النصوص الثابتة) |
| إضافة صفحات جديدة | مجلد `pages/` + رابط في الـ footer |

---

## 📞 الدعم

عند مواجهة مشكلة:
1. افتح **Console المتصفح** (F12) لرؤية الأخطاء.
2. تحقق من Netlify Functions logs.
3. تأكد من صحة قيم `config.js`.
4. تأكد من أن حساب المدير موجود في مجموعة `admins`.

---

**صنع من قبل SHAWQI BUILDS** © 2026
