/* ═══════════════════════════════════════════════════════════════
   REXMOTO — Client-side Firebase Configuration
   ⚠️  هذه القيم آمنة للظهور في الكود (Firebase Web API Key ليست سرّية).
   المفاتيح السرية للإدارة تُخزَّن في Variables بيئة المنصة (Vercel) فقط.
   ═══════════════════════════════════════════════════════════════ */

window.REXMOTO_CONFIG = {
  firebase: {
    apiKey: "AIzaSyBFQksNRaSD-KU7J2r2gqYHw423Bcxyc9w",
    authDomain: "rexmoto-82c54.firebaseapp.com",
    projectId: "rexmoto-82c54",
    storageBucket: "rexmoto-82c54.firebasestorage.app",
    messagingSenderId: "577104953553",
    appId: "1:577104953553:web:fc9638b90ed8b6b43205f0"
  },
  // عنوان الدوال (Vercel Functions) — الخادم يتحقق من السعر والمخزون
  apiBase: "/api",
  storeName: "REXMOTO",
  whatsappDefault: "213550000000"
};
