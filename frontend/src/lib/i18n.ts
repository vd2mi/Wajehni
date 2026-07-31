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
} as const;
