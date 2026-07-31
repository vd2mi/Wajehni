// Single source of truth for every UI string in the Thakeen map entry flow.
// No hardcoded Arabic in JSX — components read from this dictionary.

export const t = {
  app: {
    name: "ذكين",
    nameEn: "Thakeen",
    tagline: "منصة التعلم الذكي",
    metaTitle: "ذكين — منصة التعلم الذكي",
    metaDescription:
      "ذكين — منصة تعلم ذكية لطلاب الجامعات: اختر جامعتك وتخصصك، وافهم مقرراتك بالذكاء الاصطناعي.",
  },
  map: {
    title: "اختر منطقتك",
    subtitle: "انطلق من الخريطة نحو جامعتك ثم كليتك ثم تخصصك",
    pickUniversity: "اختر جامعتك",
    comingSoon: "قريباً",
    mapLabel: "خريطة مناطق المملكة العربية السعودية",
  },
  breadcrumb: {
    home: "الرئيسية",
    label: "مسار التنقل",
  },
  common: {
    loading: "جارٍ التحميل...",
    loadError: "تعذر الاتصال بالخادم. تأكد من تشغيل الخادم الخلفي.",
    notFound: "الصفحة المطلوبة غير موجودة.",
  },
  university: {
    pickMajor: "اختر كليتك ثم تخصصك",
    majorsCount: (n: number) => (n === 1 ? "تخصص واحد" : `${n} تخصصات`),
  },
  majorSpace: {
    title: "مساحة التخصص",
    tabCourses: "مكتبة المقررات",
    tabBoard: "مجلس التخصص",
    noCourses: "لم تتم إضافة المقررات بعد",
    filesCount: (n: number) =>
      n === 0 ? "لا توجد ملفات" : n === 1 ? "ملف واحد" : `${n} ملفات`,
    openInExplain: "افتح في الشرح",
    uploadFile: "رفع ملف PDF",
    uploading: "جارٍ الرفع...",
    uploadDone: "تم الرفع",
    uploadFailed: "فشل رفع الملف",
    boardComingSoon: "مجلس التخصص قادم قريباً",
    levelName: (level: number) => {
      const ordinals = [
        "الأول", "الثاني", "الثالث", "الرابع", "الخامس",
        "السادس", "السابع", "الثامن", "التاسع", "العاشر",
      ];
      return `المستوى ${ordinals[level - 1] ?? level}`;
    },
  },
} as const;
