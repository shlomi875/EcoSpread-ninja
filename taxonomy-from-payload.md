# טקסונומיה (Dialoria / Payload)

מסמך זה נוצר אוטומטית מנתוני PostgreSQL של Payload (טבלאות הקולקציות בקבוצת **טקסונומיה**).

**תאריך יצוא:** 2026-04-14

---

## צבעים

- **Payload collection slug:** `colors`
- **טבלת DB:** `colors`

| id | name | hex_code | key |
| --- | --- | --- | --- |
| 14 | אדום | #FF0000 | red |
| 3 | אפור | #808080 | gray |
| 15 | בורדו | #800000 | burgundy |
| 9 | ברונזה | #CD7F32 | bronze |
| 6 | זהב | #FFD700 | gold |
| 19 | זהב ורוד | #F6D4D7 | Rose Gold |
| 16 | חום | #A52A2A | brown |
| 8 | טיטניום | #878681 | titanium |
| 12 | ירוק | #008000 | green |
| 13 | ירוק זית | #556B2F | olive-green |
| 10 | כחול | #0000FF | blue |
| 11 | כחול נייבי | #000080 | navy-blue |
| 5 | כסף | #C0C0C0 | silver |
| 2 | לבן | #FFFFFF | white |
| 17 | צהוב | #FFFF00 | yellow |
| 4 | קרם | #FFFDD0 | cream |
| 7 | רוז גולד | #B76E79 | rose-gold |
| 1 | שחור | #000000 | black |
| 18 | שמפניה | #F7E7CE | champagne |

---

## מגדרים

- **Payload collection slug:** `genders`
- **טבלת DB:** `genders`

| id | name | key |
| --- | --- | --- |
| 1 | גברים | men |
| 3 | יוניסקס | unisex |
| 2 | נשים | women |

---

## מנגנונים

- **Payload collection slug:** `mechanisms`
- **טבלת DB:** `mechanisms`

| id | name | key |
| --- | --- | --- |
| 2 | אוטומטי | automatic |
| 3 | מכאני (מתיחה ידנית) | mechanical-manual |
| 7 | מנגנון אינהאוס אוטומטי | automatic-in-house |
| 4 | סולארי | solar |
| 1 | קוורץ | quartz |
| 5 | קינטי | kinetic |
| 6 | שעון חכם | smartwatch |

---

## חומרי רצועה

- **Payload collection slug:** `strap-materials`
- **טבלת DB:** `strap_materials`

| id | name | key |
| --- | --- | --- |
| 6 | DLC | dlc |
| 5 | PVD | pvd |
| 10 | בד (נאטו) | fabric-nato |
| 8 | גומי | rubber |
| 3 | זהב | gold |
| 2 | טיטניום | titanium |
| 9 | סיליקון | silicone |
| 7 | עור | leather |
| 1 | פלדת אל-חלד | stainless-steel |
| 4 | קרמיקה | ceramic |

---

## חומרי קייס

- **Payload collection slug:** `case-materials`
- **טבלת DB:** `case_materials`

| id | name | key |
| --- | --- | --- |
| 5 | DLC | dlc |
| 10 | בציפוי כסף | Silver plated |
| 7 | ברונזה | bronze |
| 3 | זהב | gold |
| 2 | טיטניום | titanium |
| 13 | מתכת בציפוי זהב | Gold-plated metal |
| 11 | מתכת בציפוי כסף | Silver-plated metal |
| 12 | מתכת בציפוי רוז גולד | Rose gold plated metal |
| 9 | סגסוגת מתכת | Metal alloy |
| 1 | פלדת אל-חלד | stainless-steel |
| 8 | ציפוי PVD | pvd |
| 6 | קרבון (Carbonox™) | CARBONOX™ |
| 4 | קרמיקה | ceramic |

---

## רמות עמידות למים

- **Payload collection slug:** `water-resistances`
- **טבלת DB:** `water_resistances`

| id | name | key |
| --- | --- | --- |
| 6 | 201 מטר ומעלה (Diver's) | diver-200m-plus |
| 1 | ללא (Splash Resistant) | splash-resistant |
| 4 | עד 100 מטר (10 ATM) | up-to-100m |
| 5 | עד 200 מטר (20 ATM) | up-to-200m |
| 2 | עד 30 מטר (3 ATM) | up-to-30m |
| 3 | עד 50 מטר (5 ATM) | up-to-50m |

---

## סוגי זכוכית

- **Payload collection slug:** `glass-types`
- **טבלת DB:** `glass_types`

| id | name | key |
| --- | --- | --- |
| 3 | אקרילית | acrylic |
| 4 | מינרל קריסטל | Mineral crystal |
| 2 | מינרלית | mineral-glass |
| 1 | ספיר קריסטל | sapphire-crystal |

---

## סוגי זוהר

- **Payload collection slug:** `luminosity-types`
- **טבלת DB:** `luminosity_types`

| id | name | key |
| --- | --- | --- |
| 2 | super-luminova | ציפוי Super-LumiNova |
| 1 | tritium-llt | צינורות טריטיום (LLT) |

---

## תכונות

- **Payload collection slug:** `features`
- **טבלת DB:** `features`

| id | name | name_en | key |
| --- | --- | --- | --- |
| 30 | 12 יהלומים | 12 diamonds | 12-diamonds |
| 29 | 12 יהלומים בלוח | 12 diamonds on dial | 12-diamonds-on-dial |
| 2 | GMT (אזור זמן נוסף) |  | gmt |
| 19 | Open Heart | Open Heart | open-heart |
| 27 | Super-LumiNova על המחוגים | Super-LumiNova on hands | super-luminova-on-hands |
| 25 | Swiss Made | Swiss Made | swiss-made |
| 45 | אנלוגי | Analog | analog |
| 10 | בזל חד-כיווני עם אינסרט קרמי שחור | Uni-directional bezel with black ceramic insert | uni-directional-bezel-with-black-ceramic-insert |
| 15 | גב קייס ספיר שקוף | Transparent sapphire case back | transparent-sapphire-case-back |
| 35 | גב קייס שקוף | Transparent case back | transparent-case-back |
| 16 | גב שקוף | Display back | display-back |
| 14 | גב שקוף מזכוכית | Observation crystal case back | observation-crystal-case-back |
| 36 | גלגל איזון חשוף | Open balance wheel | open-balance-wheel |
| 42 | זכוכית משופעת מקצה לקצה | Edge-to-edge-bevelled | edge-to-edge-bevelled |
| 26 | זכוכית ספיר עם ציפוי נוגד השתקפות | Anti-reflective sapphire crystal | anti-reflective-sapphire-crystal |
| 43 | זכוכית ספיר קמורה | Curved sapphire crystal | curved-sapphire-crystal |
| 44 | זכוכית ספיר קמורה משופעת מקצה לקצה | Edge-to-edge-bevelled curved sapphire crystal | edge-to-edge-bevelled-curved-sapphire-crystal |
| 34 | חלון שקוף וגב שקוף | See-through window and case-back | see-through-window-and-case-back |
| 40 | חלון תאריך בשעה 6 | Date guichet at 6 o’clock | date-guichet-at-6-oclock |
| 47 | טיטניום | Titanium | titanium |
| 5 | יום ותאריך |  | day-date |
| 38 | כוונון ב-5 מצבים | Adjustment in five positions | adjustment-in-five-positions |
| 1 | כרונוגרף |  | chronograph |
| 13 | כתר הברגה | Screw-down crown | screw-down-crown |
| 41 | לוגו Jubilé | Jubilé logo | jubil-logo |
| 18 | לוח Open Heart | Open Heart dial | open-heart-dial |
| 8 | לוח שלד | Skeleton dial | skeleton-dial |
| 6 | מד טכימטר |  | tachymeter |
| 51 | מחוגים בצבע זהב צהוב עם ציפוי לבן ו-Super-LumiNova לבן | Yellow gold-coloured hands with white veneer and white Super-LumiNova | yellow-gold-coloured-hands-with-white-veneer-and-white-super-luminova |
| 32 | מחוגים בצבע רודיום | Rhodium coloured hands | rhodium-coloured-hands |
| 31 | מחוגים בציפוי רודיום | Rhodium-plated hands | rhodium-plated-hands |
| 22 | מחוגים וסמנים זוהרים | Luminescent hands and markers | luminescent-hands-and-markers |
| 9 | מחוגים וסמנים זוהרים בגוון פלדה | Steel tone luminous hands and markers | steel-tone-luminous-hands-and-markers |
| 21 | מחוגים זוהרים | Luminous hands | luminous-hands |
| 7 | מחוון אנרגיה |  | power-reserve-indicator |
| 52 | מסילת דקות | Minute track | minute-track |
| 3 | מצב ירח (Moonphase) |  | moonphase |
| 28 | סמני Super-LumiNova | Super-LumiNova markers | super-luminova-markers |
| 23 | סמני אינדקס בלוח | Index dial markers | index-dial-markers |
| 24 | סמני דקות סביב השוליים | Minute markers around the outer rim | minute-markers-around-the-outer-rim |
| 50 | סמנים ומחוגים | Indexes and hands | indexes-and-hands |
| 20 | סקלטון | Skeletonized | skeletonized |
| 48 | עוגן מסתובב על גב רובי | Rotating anchor on a ruby backplate | rotating-anchor-on-a-ruby-backplate |
| 17 | עיצוב Open Heart | Open Heart design | open-heart-design |
| 12 | עתודת אנרגיה 80 שעות | 80 hours power reserve | 80-hours-power-reserve |
| 49 | פונקציות כרונוגרף: 12 שעות, 30 דקות, שניות קטנות | Chronograph functions (12-hour, 30-minute, small seconds) | chronograph-functions |
| 33 | קישוט נצנוץ רודיום בלוח | Rhodium glitter decoration on dial | rhodium-glitter-decoration-on-dial |
| 11 | קפיץ איזון Nivachron אנטי-מגנטי | Antimagnetic Nivachron hairspring | antimagnetic-nivachron-hairspring |
| 46 | קרמיקה | Ceramic | ceramic |
| 4 | תאריכון |  | date |
| 37 | תנועת מנגנון נבדקה ב-5 מצבים | Movement tested in 5 positions | movement-tested-in-5-positions |
| 39 | תצוגת תאריך | Date display | date-display |

---

## סגנונות שעון

- **Payload collection slug:** `watch-styles`
- **טבלת DB:** `watch_styles`

| id | name | slug | description | seo_title |
| --- | --- | --- | --- | --- |
| 6 | אופנה | fashion | קולקציית שעוני האופנה שלנו מציעה מגוון מסחרר של דגמים עדכניים, לגברים ונשים כאחד. בחרו שעון שישדרג כל הופעה – מיומיומית ועד לאירועים מיוחדים. אצלנו תמצאו את הטרנדים החמים ביותר, המשלבים עיצוב נועז וחדשני עם איכות בלתי מתפשרת. ביטוי אישי וסטייל מושלם מחכים לכם. | שעוני אופנה: קולקציות חדשות 2025 לגברים ונשים \| טרנדים וסטייל |
| 5 | אלגנטי | dress | גלו את קולקציית שעוני הדרס האלגנטיים שלנו, המשלבים יוקרה, סטייל ודיוק לכל אירוע מיוחד. שעונים אלו, המתאימים לגברים ולנשים, מציעים עיצוב קלאסי ונקי שישלים בצורה מושלמת כל לבוש רשמי או עסקי. בחרו שעון אלגנטי שישדרג את המראה שלכם ויוסיף נופך של קלאסה. | שעונים אלגנטיים (Dress) לגבר ולאישה \| יוקרה, סטייל ודיוק |
| 10 | טקטי | tactical | גלו את קולקציית השעונים הטקטיים שלנו, המיועדים לעמוד בתנאים הקשים ביותר. שעונים אלו בנויים לעמידות מרבית, אמינות יוצאת דופן ופונקציונליות חיונית לכל משימה. מושלמים לחיילים, מטיילים, ואוהבי שטח המחפשים שעון קשוח שישרוד כל הרפתקה. בחרו שעון שיעניק לכם ביטחון ואמינות בכל מצב. | שעוני טקטיים \| עמידים, קשוחים לכל משימה ואתגר |
| 1 | יוקרה | luxury | גלו את עולם היוקרה עם קולקציית שעוני הפרימיום שלנו. כל שעון הוא יצירת מופת של אומנות ודיוק, המשלב עיצוב עוצר נשימה עם חומרים איכותיים ללא פשרות. בחרו בשעון שמשקף את הסגנון הייחודי שלכם ומעניק לכם נוכחות יוקרתית בכל רגע. חוו את ההבדל של יוקרה אמיתית על פרק כף היד. | שעוני יוקרה \| קולקציית פרימיום לגברים ונשים \| מותגים מובילים ועיצובים נצחיים |
| 3 | כרונוגרף | chronograph | שעוני כרונוגרף משלבים דיוק, פונקציונליות וסטייל עוצמתי. שעונים אלו, עם פונקציית הסטופר המובנית ותת-חוגות ייחודיות, מושלמים למדידת זמנים מדויקת. אידיאליים לחובבי ספורט, תעופה או פשוט למי שמעריך שעון בעל נוכחות מרשימה וביצועים גבוהים. | שעוני כרונוגרף יוקרתיים \| כרונוגרף לגבר ולאישה \| מבחר דגמים בעיצוב מנצח |
| 2 | מינימליסטי | minimalist | קולקציית השעונים המינימליסטיים שלנו מציגה עיצוב נקי, מודרני ואלגנטי, מושלם למי שאוהב יוקרה מאופקת. שעונים אלו מתאפיינים בקווים פשוטים ובחיוג ברור, ומספקים נוחות מרבית וסגנון על-זמני. בחרו בשעון שישלים כל לוק, מהיומיומי ועד המהודר, ויבטא את הטעם הייחודי שלכם בפשטות ובדיוק מושלם. | שעונים מינימליסטיים \| עיצוב נקי, אלגנטי ומודרני לגבר ולאישה |
| 9 | ספורט | sport | שעוני הספורט שלנו מותאמים לאורח חיים אקטיבי ולכל פעילות גופנית. הם משלבים עמידות מרבית למים וזעזועים עם פונקציונליות מתקדמת, הכוללת מדידת דופק, צעדים ועוד. תכננו את השעון המושלם שיסייע לכם למדוד ביצועים, להתאמן בשיא הנוחות ולקדם את יעדי הכושר שלכם, בסטייל ובאמינות. | שעוני ספורט \| קולקציית שעונים עמידים ואיכותיים לגברים ונשים \| מותגים מובילים |
| 8 | עיצוב מודרני | modern-design | גלו את קולקציית השעונים בעיצוב מודרני שלנו, המשלבת קווים נקיים, מינימליזם ואסתטיקה עכשווית. שעונים אלו, העשויים מחומרים חדשניים, מציעים מראה יוקרתי ואלגנטי. הם מושלמים למי שמחפש אמירה אופנתית עדכנית ונוכחות מתוחכמת. בחרו שעון שישדרג כל הופעה ויבטא את סגנונכם הייחודי. | שעונים בעיצוב מודרני: סגנון עכשווי, חדשנות ויוקרה לפרק כף היד |
| 11 | צלילה | dive | גלו את קולקציית שעוני הצלילה (Dive) המרשימה שלנו, המשלבת עמידות יוצאת דופן למים, דיוק מקסימלי ועיצוב אלגנטי. השעונים האלה, המתאימים לצוללנים מקצועיים ולחובבי ים כאחד, בנויים לעמוד בתנאים הקשים ביותר תוך שמירה על סטייל יוקרתי, בין אם אתם מתחת למים או מעל פני השטח. | שעוני צלילה (Dive) - קולקציית יוקרה ועמידות למים \| מושלם לצוללנים וחובבי ים |
| 4 | קלאסי | classic | גלו את קולקציית השעונים הקלאסיים שלנו, המשלבת אלגנטיות נצחית עם סטייל בלתי מתפשר. שעונים אלו, בעלי עיצוב מינימליסטי ומתוחכם, מתאימים לכל אירוע – מפגישת עסקים ועד ערב חגיגי. בחרו בשעון קלאסי שילווה אתכם לאורך שנים וישדר יוקרה וטעם משובח בכל עת. | שעונים קלאסיים לגברים ונשים \| עיצוב אלגנטי ונצחי |
| 7 | שעון צבאי | military-watch | שעון צבאי נבנה לעמידות בתנאים קשים – קרביים, שטח, ים ואוויר. דגמים אלו מתאפיינים בחוזק מכני, עמידות למים ולזעזועים, ותצוגה ברורה גם בתנאי חושך. הם פופולריים בקרב לוחמים, אנשי שטח, מטיילים והרפתקנים. | שעונים צבאיים קשוחים – Military Watches \| NINJA SHOP |

---

