import { useLanguage, type Language } from "@/lib/i18n";

type QA = { q: string; a: string };

type PagesText = {
  faqTitle: string;
  faqSubtitle: string;
  faqItems: QA[];
  contactTitle: string;
  contactSubtitle: string;
  contactPending: string;
  contactPassenger: string;
  contactDriver: string;
};

const pages: Record<Language, PagesText> = {
  en: {
    faqTitle: "Frequently asked questions",
    faqSubtitle: "Everything you need to know about airport transfers from Makkah and Madinah.",
    faqItems: [
      { q: "Which routes are available?", a: "Transfers run from Makkah and Madinah to Jeddah, Madinah and Taif airports." },
      { q: "How do I book a transfer?", a: "Choose your city and exact pickup point, pick your airport, date and time, add passengers and luggage, then select a driver offer and confirm." },
      { q: "What is the difference between private and shared?", a: "A private ride is only for your group. A shared ride is cheaper because seats are shared with other travellers on the same route." },
      { q: "Who sets the price?", a: "Each driver publishes their own price. The price shown on the offer is locked into your booking when you confirm." },
      { q: "Can I book in advance?", a: "Yes. Choose any future date and pickup time when you create the booking." },
      { q: "How do I become a driver?", a: "Open the driver page and register with your phone number, vehicle details and vehicle photos." },
    ],
    contactTitle: "Contact us",
    contactSubtitle: "We are happy to help with bookings, routes and driver registration.",
    contactPending: "Our public phone number and email address are being finalised and will be published here shortly.",
    contactPassenger: "Book a transfer",
    contactDriver: "Join as a driver",
  },
  uz: {
    faqTitle: "Ko‘p beriladigan savollar",
    faqSubtitle: "Makka va Madinadan aeroport transferlari haqida bilishingiz kerak bo‘lgan hamma narsa.",
    faqItems: [
      { q: "Qanday yo‘nalishlar mavjud?", a: "Transferlar Makka va Madinadan Jidda, Madina va Toif aeroportlariga amalga oshiriladi." },
      { q: "Transferni qanday buyurtma qilaman?", a: "Shahar va aniq olib ketish joyini tanlang, aeroport, sana va vaqtni ko‘rsating, yo‘lovchi va yuklarni qo‘shing, so‘ng haydovchi taklifini tanlab tasdiqlang." },
      { q: "Shaxsiy va umumiy safar farqi nimada?", a: "Shaxsiy safar faqat sizning guruhingiz uchun. Umumiy safar arzonroq, chunki o‘rindiqlar bir yo‘nalishdagi boshqa yo‘lovchilar bilan bo‘lishiladi." },
      { q: "Narxni kim belgilaydi?", a: "Har bir haydovchi o‘z narxini e’lon qiladi. Taklifda ko‘rsatilgan narx tasdiqlaganingizda buyurtmaga qat’iy biriktiriladi." },
      { q: "Oldindan buyurtma qilsam bo‘ladimi?", a: "Ha. Buyurtma yaratganda kelajakdagi istalgan sana va vaqtni tanlashingiz mumkin." },
      { q: "Haydovchi bo‘lish uchun nima qilishim kerak?", a: "Haydovchi sahifasini oching va telefon raqamingiz, avtomobil ma’lumotlari va rasmlari bilan ro‘yxatdan o‘ting." },
    ],
    contactTitle: "Aloqa",
    contactSubtitle: "Buyurtma, yo‘nalishlar va haydovchi ro‘yxati bo‘yicha yordam beramiz.",
    contactPending: "Ommaviy telefon raqamimiz va elektron pochtamiz tasdiqlanmoqda va tez orada shu yerda e’lon qilinadi.",
    contactPassenger: "Transfer buyurtma qilish",
    contactDriver: "Haydovchi sifatida qo‘shilish",
  },
  ru: {
    faqTitle: "Частые вопросы",
    faqSubtitle: "Всё, что нужно знать о трансферах из Мекки и Медины в аэропорты.",
    faqItems: [
      { q: "Какие маршруты доступны?", a: "Трансферы выполняются из Мекки и Медины в аэропорты Джидды, Медины и Таифа." },
      { q: "Как забронировать трансфер?", a: "Выберите город и точное место посадки, укажите аэропорт, дату и время, добавьте пассажиров и багаж, затем выберите предложение водителя и подтвердите." },
      { q: "Чем частная поездка отличается от совместной?", a: "Частная поездка только для вашей группы. Совместная дешевле, потому что места делятся с другими пассажирами на том же маршруте." },
      { q: "Кто устанавливает цену?", a: "Каждый водитель публикует свою цену. Цена из предложения фиксируется в брони в момент подтверждения." },
      { q: "Можно ли бронировать заранее?", a: "Да. При создании брони выберите любую будущую дату и время посадки." },
      { q: "Как стать водителем?", a: "Откройте страницу водителя и зарегистрируйтесь, указав телефон, данные автомобиля и его фотографии." },
    ],
    contactTitle: "Контакты",
    contactSubtitle: "Поможем с бронированием, маршрутами и регистрацией водителей.",
    contactPending: "Наш публичный номер телефона и адрес электронной почты уточняются и скоро появятся здесь.",
    contactPassenger: "Забронировать трансфер",
    contactDriver: "Стать водителем",
  },
  ar: {
    faqTitle: "الأسئلة الشائعة",
    faqSubtitle: "كل ما تحتاج معرفته عن التنقل إلى المطارات من مكة والمدينة.",
    faqItems: [
      { q: "ما الوجهات المتاحة؟", a: "تنطلق الرحلات من مكة والمدينة إلى مطارات جدة والمدينة والطائف." },
      { q: "كيف أحجز رحلة؟", a: "اختر المدينة ونقطة الانطلاق بدقة، ثم المطار والتاريخ والوقت، وأضف المسافرين والأمتعة، ثم اختر عرض السائق وأكِّد الحجز." },
      { q: "ما الفرق بين الرحلة الخاصة والمشتركة؟", a: "الرحلة الخاصة لمجموعتك وحدها، والمشتركة أقل سعرًا لأن المقاعد تُشارك مع مسافرين آخرين على المسار نفسه." },
      { q: "من يحدد السعر؟", a: "كل سائق ينشر سعره الخاص، ويُثبَّت سعر العرض في حجزك لحظة التأكيد." },
      { q: "هل يمكن الحجز مسبقًا؟", a: "نعم، اختر أي تاريخ ووقت مستقبلي عند إنشاء الحجز." },
      { q: "كيف أصبح سائقًا؟", a: "افتح صفحة السائق وسجّل برقم هاتفك وبيانات سيارتك وصورها." },
    ],
    contactTitle: "تواصل معنا",
    contactSubtitle: "يسعدنا مساعدتك في الحجز والوجهات وتسجيل السائقين.",
    contactPending: "يجري تأكيد رقم الهاتف والبريد الإلكتروني العامَّين وسيُنشران هنا قريبًا.",
    contactPassenger: "حجز رحلة",
    contactDriver: "الانضمام كسائق",
  },
};

export function usePagesText(): PagesText {
  const { language } = useLanguage();
  return pages[language];
}
