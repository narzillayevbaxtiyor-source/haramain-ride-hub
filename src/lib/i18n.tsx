import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "uz" | "ru" | "ar";

const translations = {
  uz: {
    language: "O‘zbekcha",
    navPassenger: "Yo‘lovchi",
    navDriver: "Haydovchi",
    navRoutes: "Yo‘nalishlar",
    eyebrow: "Makka va Madinadan aeroportlarga",
    heroTitle: "Haramain 2 Airport",
    heroSubtitle: "Makka va Madinadan aeroportga oson transfer",
    heroBody: "Safaringiz uchun qulay transportni tanlang. Yo‘lovchilar va mahalliy haydovchilarni bir joyda bog‘laymiz.",
    choosePath: "Qanday davom etmoqchisiz?",
    choosePathBody: "Safaringizga mos yo‘lni tanlang.",
    passenger: "Yo‘lovchiman",
    passengerText: "Aeroportga mashina buyurtma qilish",
    driver: "Haydovchiman",
    driverText: "Haydovchi sifatida qo‘shilish",
    continue: "Davom etish",
    popular: "Mashhur aeroport transferlari",
    popularBody: "Makka va Madinadan eng ko‘p tanlanadigan aeroport yo‘nalishlari.",
    makkah: "Makka",
    madinah: "Madina",
    jeddahAirport: "Jidda aeroporti",
    madinahAirport: "Madina aeroporti",
    taifAirport: "Toif aeroporti",
    why: "Nega Haramain 2 Airport?",
    whyBody: "Aeroport safarini sodda va qulay qilish uchun yaratilgan.",
    easy: "Oson buyurtma",
    easyText: "Kerakli yo‘nalishni bir necha qadamda tanlang.",
    chooseDriver: "Haydovchini tanlang",
    chooseDriverText: "Safaringizga mos haydovchini o‘zingiz tanlang.",
    rideTypes: "Shaxsiy va umumiy safar",
    rideTypesText: "Ehtiyojingizga mos transport turini tanlang.",
    prices: "Raqobatbardosh narxlar",
    pricesText: "Turli safar variantlarini qulay tarzda solishtiring.",
    footerText: "Makka va Madinadan aeroportga qulay transferlar.",
    faq: "Savollar",
    contact: "Aloqa",
    comingSoon: "Tez orada",
    backHome: "Bosh sahifaga qaytish",
    placeholderPassenger: "Yo‘lovchilar uchun buyurtma jarayoni keyingi bosqichda tayyorlanadi.",
    placeholderDriver: "Haydovchilar uchun ro‘yxatdan o‘tish keyingi bosqichda tayyorlanadi.",
  },
  ru: {
    language: "Русский",
    navPassenger: "Пассажир",
    navDriver: "Водитель",
    navRoutes: "Маршруты",
    eyebrow: "Из Мекки и Медины в аэропорты",
    heroTitle: "Haramain 2 Airport",
    heroSubtitle: "Удобные трансферы из Мекки и Медины",
    heroBody: "Выберите комфортный транспорт для поездки. Мы объединяем пассажиров и местных водителей в одном месте.",
    choosePath: "Как вы хотите продолжить?",
    choosePathBody: "Выберите подходящий вариант.",
    passenger: "Я пассажир",
    passengerText: "Заказать машину в аэропорт",
    driver: "Я водитель",
    driverText: "Присоединиться как водитель",
    continue: "Продолжить",
    popular: "Популярные трансферы",
    popularBody: "Самые востребованные маршруты из Мекки и Медины.",
    makkah: "Мекка",
    madinah: "Медина",
    jeddahAirport: "Аэропорт Джидды",
    madinahAirport: "Аэропорт Медины",
    taifAirport: "Аэропорт Таифа",
    why: "Почему Haramain 2 Airport?",
    whyBody: "Создано, чтобы сделать поездку в аэропорт простой и удобной.",
    easy: "Простое бронирование",
    easyText: "Выберите маршрут всего за несколько шагов.",
    chooseDriver: "Выберите водителя",
    chooseDriverText: "Самостоятельно выберите водителя для поездки.",
    rideTypes: "Частные и совместные поездки",
    rideTypesText: "Выберите подходящий формат трансфера.",
    prices: "Конкурентные цены",
    pricesText: "Удобно сравнивайте разные варианты поездки.",
    footerText: "Удобные трансферы из Мекки и Медины в аэропорты.",
    faq: "Вопросы",
    contact: "Контакты",
    comingSoon: "Скоро",
    backHome: "Вернуться на главную",
    placeholderPassenger: "Процесс заказа для пассажиров появится на следующем этапе.",
    placeholderDriver: "Регистрация водителей появится на следующем этапе.",
  },
  ar: {
    language: "العربية",
    navPassenger: "المسافر",
    navDriver: "السائق",
    navRoutes: "الوجهات",
    eyebrow: "من مكة والمدينة إلى المطارات",
    heroTitle: "Haramain 2 Airport",
    heroSubtitle: "تنقّل سهل إلى المطارات من مكة والمدينة",
    heroBody: "اختر وسيلة النقل المناسبة لرحلتك. نربط المسافرين بالسائقين المحليين في مكان واحد.",
    choosePath: "كيف ترغب في المتابعة؟",
    choosePathBody: "اختر المسار المناسب لرحلتك.",
    passenger: "أنا مسافر",
    passengerText: "حجز سيارة إلى المطار",
    driver: "أنا سائق",
    driverText: "الانضمام كسائق",
    continue: "متابعة",
    popular: "أشهر رحلات المطار",
    popularBody: "الوجهات الأكثر اختيارًا من مكة والمدينة.",
    makkah: "مكة",
    madinah: "المدينة",
    jeddahAirport: "مطار جدة",
    madinahAirport: "مطار المدينة",
    taifAirport: "مطار الطائف",
    why: "لماذا Haramain 2 Airport؟",
    whyBody: "صُممت الخدمة لتجعل رحلتك إلى المطار سهلة ومريحة.",
    easy: "حجز سهل",
    easyText: "اختر وجهتك بخطوات بسيطة.",
    chooseDriver: "اختر سائقك",
    chooseDriverText: "اختر السائق المناسب لرحلتك بنفسك.",
    rideTypes: "رحلات خاصة ومشتركة",
    rideTypesText: "اختر نوع التنقل الذي يناسب احتياجك.",
    prices: "أسعار تنافسية",
    pricesText: "قارن خيارات الرحلة المختلفة بسهولة.",
    footerText: "تنقّل مريح إلى المطارات من مكة والمدينة.",
    faq: "الأسئلة الشائعة",
    contact: "تواصل معنا",
    comingSoon: "قريبًا",
    backHome: "العودة إلى الرئيسية",
    placeholderPassenger: "ستتوفر خطوات الحجز للمسافرين في المرحلة القادمة.",
    placeholderDriver: "سيتوفر تسجيل السائقين في المرحلة القادمة.",
  },
} as const;

export type Translation = (typeof translations)["uz"];

type LanguageContextValue = { language: Language; setLanguage: (value: Language) => void; t: Translation };
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("uz");
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: translations[language] as Translation }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
