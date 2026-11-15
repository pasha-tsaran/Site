# Локальные компоненты PDF

- PDF-LIB 1.17.1, MIT: `dist/assets/vendor/pdf-lib.min.js`, лицензия рядом. Источник: https://pdf-lib.js.org/ и пакет pdf-lib из среды разработки.
- @pdf-lib/fontkit 1.1.1, MIT: `dist/assets/vendor/fontkit.umd.min.js`, уведомление и условия в `fontkit-NOTICE.txt`. Источник: https://github.com/Hopding/fontkit и https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js.
- Noto Sans Regular/Bold, SIL Open Font License: `dist/assets/pdf/`, файл лицензии рядом. Источник: https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSans.

Зависимости и шрифты поставляются с сайтом. При создании PDF нет запросов к CDN. В автономном HTML библиотеки и шрифты встроены; контакты пользователя в PDF не включаются.
