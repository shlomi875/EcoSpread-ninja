// ─── Taxonomy constants from Payload CMS (taxonomy-from-payload.md) ───────────
// Values stored in DB and sent to AI use the English `key` slug.

export type TaxonomyItem = { id: number; name: string; key: string };
export type ColorItem = TaxonomyItem & { hex: string };
export type FeatureItem = TaxonomyItem & { nameEn: string };

// ── Colors (צבעים) ───────────────────────────────────────────────────────────
export const COLORS: ColorItem[] = [
  { id: 1,  name: 'שחור',       key: 'black',        hex: '#000000' },
  { id: 2,  name: 'לבן',        key: 'white',        hex: '#FFFFFF' },
  { id: 3,  name: 'אפור',       key: 'gray',         hex: '#808080' },
  { id: 4,  name: 'קרם',        key: 'cream',        hex: '#FFFDD0' },
  { id: 5,  name: 'כסף',        key: 'silver',       hex: '#C0C0C0' },
  { id: 6,  name: 'זהב',        key: 'gold',         hex: '#FFD700' },
  { id: 7,  name: 'רוז גולד',   key: 'rose-gold',    hex: '#B76E79' },
  { id: 8,  name: 'טיטניום',    key: 'titanium',     hex: '#878681' },
  { id: 9,  name: 'ברונזה',     key: 'bronze',       hex: '#CD7F32' },
  { id: 10, name: 'כחול',       key: 'blue',         hex: '#0000FF' },
  { id: 11, name: 'כחול נייבי', key: 'navy-blue',    hex: '#000080' },
  { id: 12, name: 'ירוק',       key: 'green',        hex: '#008000' },
  { id: 13, name: 'ירוק זית',   key: 'olive-green',  hex: '#556B2F' },
  { id: 14, name: 'אדום',       key: 'red',          hex: '#FF0000' },
  { id: 15, name: 'בורדו',      key: 'burgundy',     hex: '#800000' },
  { id: 16, name: 'חום',        key: 'brown',        hex: '#A52A2A' },
  { id: 17, name: 'צהוב',       key: 'yellow',       hex: '#FFFF00' },
  { id: 18, name: 'שמפניה',     key: 'champagne',    hex: '#F7E7CE' },
  { id: 19, name: 'זהב ורוד',   key: 'Rose Gold',    hex: '#F6D4D7' },
];

// ── Genders (מגדרים) ─────────────────────────────────────────────────────────
export const GENDERS: TaxonomyItem[] = [
  { id: 1, name: 'גברים',   key: 'men'     },
  { id: 2, name: 'נשים',    key: 'women'   },
  { id: 3, name: 'יוניסקס', key: 'unisex'  },
];

// ── Mechanisms / Movements (מנגנונים) ────────────────────────────────────────
export const MECHANISMS: TaxonomyItem[] = [
  { id: 1, name: 'קוורץ',                    key: 'quartz'              },
  { id: 2, name: 'אוטומטי',                  key: 'automatic'           },
  { id: 3, name: 'מכאני (מתיחה ידנית)',      key: 'mechanical-manual'   },
  { id: 4, name: 'סולארי',                   key: 'solar'               },
  { id: 5, name: 'קינטי',                    key: 'kinetic'             },
  { id: 6, name: 'שעון חכם',                 key: 'smartwatch'          },
  { id: 7, name: 'מנגנון אינהאוס אוטומטי',  key: 'automatic-in-house'  },
];

// ── Strap Materials (חומרי רצועה) ────────────────────────────────────────────
export const STRAP_MATERIALS: TaxonomyItem[] = [
  { id: 1,  name: 'פלדת אל-חלד', key: 'stainless-steel' },
  { id: 2,  name: 'טיטניום',     key: 'titanium'        },
  { id: 3,  name: 'זהב',         key: 'gold'            },
  { id: 4,  name: 'קרמיקה',      key: 'ceramic'         },
  { id: 5,  name: 'PVD',         key: 'pvd'             },
  { id: 6,  name: 'DLC',         key: 'dlc'             },
  { id: 7,  name: 'עור',         key: 'leather'         },
  { id: 8,  name: 'גומי',        key: 'rubber'          },
  { id: 9,  name: 'סיליקון',     key: 'silicone'        },
  { id: 10, name: 'בד (נאטו)',   key: 'fabric-nato'     },
];

// ── Case Materials (חומרי קייס) ──────────────────────────────────────────────
export const CASE_MATERIALS: TaxonomyItem[] = [
  { id: 1,  name: 'פלדת אל-חלד',          key: 'stainless-steel'          },
  { id: 2,  name: 'טיטניום',               key: 'titanium'                 },
  { id: 3,  name: 'זהב',                   key: 'gold'                     },
  { id: 4,  name: 'קרמיקה',                key: 'ceramic'                  },
  { id: 5,  name: 'DLC',                   key: 'dlc'                      },
  { id: 6,  name: 'קרבון (Carbonox™)',     key: 'CARBONOX'                 },
  { id: 7,  name: 'ברונזה',                key: 'bronze'                   },
  { id: 8,  name: 'ציפוי PVD',             key: 'pvd'                      },
  { id: 9,  name: 'סגסוגת מתכת',           key: 'metal-alloy'              },
  { id: 10, name: 'בציפוי כסף',            key: 'silver-plated'            },
  { id: 11, name: 'מתכת בציפוי כסף',       key: 'silver-plated-metal'      },
  { id: 12, name: 'מתכת בציפוי רוז גולד',  key: 'rose-gold-plated-metal'   },
  { id: 13, name: 'מתכת בציפוי זהב',       key: 'gold-plated-metal'        },
];

// ── Water Resistances (רמות עמידות למים) ────────────────────────────────────
export const WATER_RESISTANCES: TaxonomyItem[] = [
  { id: 1, name: 'ללא (Splash Resistant)',      key: 'splash-resistant'  },
  { id: 2, name: 'עד 30 מטר (3 ATM)',          key: 'up-to-30m'         },
  { id: 3, name: 'עד 50 מטר (5 ATM)',          key: 'up-to-50m'         },
  { id: 4, name: 'עד 100 מטר (10 ATM)',        key: 'up-to-100m'        },
  { id: 5, name: 'עד 200 מטר (20 ATM)',        key: 'up-to-200m'        },
  { id: 6, name: '201 מטר ומעלה (Diver\'s)',   key: 'diver-200m-plus'   },
];

// ── Glass Types (סוגי זכוכית) ────────────────────────────────────────────────
export const GLASS_TYPES: TaxonomyItem[] = [
  { id: 1, name: 'ספיר קריסטל',   key: 'sapphire-crystal'  },
  { id: 2, name: 'מינרלית',        key: 'mineral-glass'     },
  { id: 3, name: 'אקרילית',        key: 'acrylic'           },
  { id: 4, name: 'מינרל קריסטל',  key: 'mineral-crystal'   },
];

// ── Luminosity Types (סוגי זוהר) ────────────────────────────────────────────
export const LUMINOSITY_TYPES: TaxonomyItem[] = [
  { id: 1, name: 'צינורות טריטיום (LLT)',   key: 'tritium-llt'    },
  { id: 2, name: 'ציפוי Super-LumiNova',    key: 'super-luminova' },
];

// ── Watch Styles (סגנונות שעון) ──────────────────────────────────────────────
export const WATCH_STYLES: TaxonomyItem[] = [
  { id: 1,  name: 'יוקרה',         key: 'luxury'         },
  { id: 2,  name: 'מינימליסטי',    key: 'minimalist'     },
  { id: 3,  name: 'כרונוגרף',      key: 'chronograph'    },
  { id: 4,  name: 'קלאסי',         key: 'classic'        },
  { id: 5,  name: 'אלגנטי',        key: 'dress'          },
  { id: 6,  name: 'אופנה',         key: 'fashion'        },
  { id: 7,  name: 'שעון צבאי',     key: 'military-watch' },
  { id: 8,  name: 'עיצוב מודרני',  key: 'modern-design'  },
  { id: 9,  name: 'ספורט',         key: 'sport'          },
  { id: 10, name: 'טקטי',          key: 'tactical'       },
  { id: 11, name: 'צלילה',         key: 'dive'           },
];

// ── Features (תכונות) ────────────────────────────────────────────────────────
export const FEATURES: FeatureItem[] = [
  { id: 1,  name: 'כרונוגרף',                                              nameEn: 'Chronograph',                                            key: 'chronograph'                                              },
  { id: 2,  name: 'GMT (אזור זמן נוסף)',                                   nameEn: 'GMT',                                                    key: 'gmt'                                                      },
  { id: 3,  name: 'מצב ירח (Moonphase)',                                   nameEn: 'Moonphase',                                              key: 'moonphase'                                                },
  { id: 4,  name: 'תאריכון',                                               nameEn: 'Date',                                                   key: 'date'                                                     },
  { id: 5,  name: 'יום ותאריך',                                            nameEn: 'Day & Date',                                             key: 'day-date'                                                 },
  { id: 6,  name: 'מד טכימטר',                                             nameEn: 'Tachymeter',                                             key: 'tachymeter'                                               },
  { id: 7,  name: 'מחוון אנרגיה',                                          nameEn: 'Power Reserve Indicator',                                key: 'power-reserve-indicator'                                  },
  { id: 8,  name: 'לוח שלד',                                               nameEn: 'Skeleton Dial',                                          key: 'skeleton-dial'                                            },
  { id: 9,  name: 'מחוגים וסמנים זוהרים בגוון פלדה',                      nameEn: 'Steel Tone Luminous Hands and Markers',                  key: 'steel-tone-luminous-hands-and-markers'                    },
  { id: 10, name: 'בזל חד-כיווני עם אינסרט קרמי שחור',                   nameEn: 'Uni-directional Bezel with Black Ceramic Insert',        key: 'uni-directional-bezel-with-black-ceramic-insert'          },
  { id: 11, name: 'קפיץ איזון Nivachron אנטי-מגנטי',                      nameEn: 'Antimagnetic Nivachron Hairspring',                       key: 'antimagnetic-nivachron-hairspring'                        },
  { id: 12, name: 'עתודת אנרגיה 80 שעות',                                 nameEn: '80 Hours Power Reserve',                                 key: '80-hours-power-reserve'                                   },
  { id: 13, name: 'כתר הברגה',                                             nameEn: 'Screw-down Crown',                                       key: 'screw-down-crown'                                         },
  { id: 14, name: 'גב קייס מזכוכית',                                       nameEn: 'Observation Crystal Case Back',                          key: 'observation-crystal-case-back'                            },
  { id: 15, name: 'גב קייס ספיר שקוף',                                     nameEn: 'Transparent Sapphire Case Back',                         key: 'transparent-sapphire-case-back'                           },
  { id: 16, name: 'גב שקוף',                                               nameEn: 'Display Back',                                           key: 'display-back'                                             },
  { id: 17, name: 'עיצוב Open Heart',                                      nameEn: 'Open Heart Design',                                      key: 'open-heart-design'                                        },
  { id: 18, name: 'לוח Open Heart',                                        nameEn: 'Open Heart Dial',                                        key: 'open-heart-dial'                                          },
  { id: 19, name: 'Open Heart',                                            nameEn: 'Open Heart',                                             key: 'open-heart'                                               },
  { id: 20, name: 'סקלטון',                                                nameEn: 'Skeletonized',                                           key: 'skeletonized'                                             },
  { id: 21, name: 'מחוגים זוהרים',                                         nameEn: 'Luminous Hands',                                         key: 'luminous-hands'                                           },
  { id: 22, name: 'מחוגים וסמנים זוהרים',                                  nameEn: 'Luminescent Hands and Markers',                          key: 'luminescent-hands-and-markers'                            },
  { id: 23, name: 'סמני אינדקס בלוח',                                      nameEn: 'Index Dial Markers',                                     key: 'index-dial-markers'                                       },
  { id: 24, name: 'סמני דקות סביב השוליים',                                nameEn: 'Minute Markers Around the Outer Rim',                    key: 'minute-markers-around-the-outer-rim'                      },
  { id: 25, name: 'Swiss Made',                                            nameEn: 'Swiss Made',                                             key: 'swiss-made'                                               },
  { id: 26, name: 'זכוכית ספיר עם ציפוי נוגד השתקפות',                    nameEn: 'Anti-reflective Sapphire Crystal',                        key: 'anti-reflective-sapphire-crystal'                         },
  { id: 27, name: 'Super-LumiNova על המחוגים',                             nameEn: 'Super-LumiNova on Hands',                                key: 'super-luminova-on-hands'                                  },
  { id: 28, name: 'סמני Super-LumiNova',                                   nameEn: 'Super-LumiNova Markers',                                 key: 'super-luminova-markers'                                   },
  { id: 29, name: '12 יהלומים בלוח',                                       nameEn: '12 Diamonds on Dial',                                    key: '12-diamonds-on-dial'                                      },
  { id: 30, name: '12 יהלומים',                                            nameEn: '12 Diamonds',                                            key: '12-diamonds'                                              },
  { id: 31, name: 'מחוגים בציפוי רודיום',                                  nameEn: 'Rhodium-plated Hands',                                   key: 'rhodium-plated-hands'                                     },
  { id: 32, name: 'מחוגים בצבע רודיום',                                    nameEn: 'Rhodium Coloured Hands',                                 key: 'rhodium-coloured-hands'                                   },
  { id: 33, name: 'קישוט נצנוץ רודיום בלוח',                               nameEn: 'Rhodium Glitter Decoration on Dial',                     key: 'rhodium-glitter-decoration-on-dial'                       },
  { id: 34, name: 'חלון שקוף וגב שקוף',                                    nameEn: 'See-through Window and Case-back',                       key: 'see-through-window-and-case-back'                         },
  { id: 35, name: 'גב קייס שקוף',                                          nameEn: 'Transparent Case Back',                                  key: 'transparent-case-back'                                    },
  { id: 36, name: 'גלגל איזון חשוף',                                       nameEn: 'Open Balance Wheel',                                     key: 'open-balance-wheel'                                       },
  { id: 37, name: 'תנועת מנגנון נבדקה ב-5 מצבים',                          nameEn: 'Movement Tested in 5 Positions',                         key: 'movement-tested-in-5-positions'                           },
  { id: 38, name: 'כוונון ב-5 מצבים',                                      nameEn: 'Adjustment in Five Positions',                           key: 'adjustment-in-five-positions'                             },
  { id: 39, name: 'תצוגת תאריך',                                           nameEn: 'Date Display',                                           key: 'date-display'                                             },
  { id: 40, name: 'חלון תאריך בשעה 6',                                     nameEn: 'Date Guichet at 6 O\'clock',                             key: 'date-guichet-at-6-oclock'                                 },
  { id: 41, name: 'לוגו Jubilé',                                           nameEn: 'Jubilé Logo',                                            key: 'jubil-logo'                                               },
  { id: 42, name: 'זכוכית משופעת מקצה לקצה',                               nameEn: 'Edge-to-edge-bevelled',                                  key: 'edge-to-edge-bevelled'                                    },
  { id: 43, name: 'זכוכית ספיר קמורה',                                     nameEn: 'Curved Sapphire Crystal',                                key: 'curved-sapphire-crystal'                                  },
  { id: 44, name: 'זכוכית ספיר קמורה משופעת מקצה לקצה',                    nameEn: 'Edge-to-edge-bevelled Curved Sapphire Crystal',          key: 'edge-to-edge-bevelled-curved-sapphire-crystal'            },
  { id: 45, name: 'אנלוגי',                                                nameEn: 'Analog',                                                 key: 'analog'                                                   },
  { id: 46, name: 'קרמיקה',                                                nameEn: 'Ceramic',                                                key: 'ceramic'                                                  },
  { id: 47, name: 'טיטניום',                                               nameEn: 'Titanium',                                               key: 'titanium'                                                 },
  { id: 48, name: 'עוגן מסתובב על גב רובי',                                nameEn: 'Rotating Anchor on a Ruby Backplate',                    key: 'rotating-anchor-on-a-ruby-backplate'                      },
  { id: 49, name: 'פונקציות כרונוגרף: 12 שעות, 30 דקות, שניות קטנות',     nameEn: 'Chronograph Functions (12-hour, 30-minute, small seconds)', key: 'chronograph-functions'                                  },
  { id: 50, name: 'סמנים ומחוגים',                                         nameEn: 'Indexes and Hands',                                      key: 'indexes-and-hands'                                        },
  { id: 51, name: 'מחוגים בצבע זהב צהוב עם ציפוי לבן ו-Super-LumiNova לבן', nameEn: 'Yellow Gold-coloured Hands with White Veneer and White Super-LumiNova', key: 'yellow-gold-coloured-hands-with-white-veneer-and-white-super-luminova' },
  { id: 52, name: 'מסילת דקות',                                            nameEn: 'Minute Track',                                           key: 'minute-track'                                             },
];
