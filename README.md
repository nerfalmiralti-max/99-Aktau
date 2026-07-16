# 99 AKTAU

Коммерческий сайт PlayStation клуба 99 AKTAU: отдельные страницы, онлайн-бронирование, встроенный административный режим, Supabase-хранилище, SEO, Google Search Console и Vercel Analytics.

## Стек

- Vite
- React
- TypeScript
- React Router
- Framer Motion
- GSAP
- Supabase REST/RPC
- Vercel Serverless Functions

## Локальный запуск

```bash
npm install
npm run dev
```

Локальный сайт открывается на адресе, который покажет Vite в терминале.

## Environment Variables

Для production нужны переменные:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

`ADMIN_SESSION_SECRET` должен быть длинной случайной строкой не короче 32 символов. Не коммитьте `.env`, `.env.local` и любые реальные секреты в Git.

## Supabase

1. Откройте Supabase SQL Editor.
2. Выполните содержимое `supabase/schema.sql`.
3. Убедитесь, что таблица `bookings` и функция `create_booking_request` созданы.
4. В Vercel добавьте `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`.

`SUPABASE_SERVICE_ROLE_KEY` используется только на сервере. Не добавляйте его в клиентский код и не используйте как `VITE_` переменную.

## Production Build

```bash
npm run build
npm run lint
npm run test:server
```

Build также генерирует `robots.txt`, `sitemap.xml` и HTML-файлы для отдельных страниц.

## Деплой в Vercel

1. Подключите GitHub-репозиторий к Vercel.
2. Укажите build command: `npm run build`.
3. Укажите output directory: `dist`.
4. Добавьте все Environment Variables из раздела выше.
5. Выполните Deploy.

## Собственный домен

В Vercel откройте Project Settings -> Domains, добавьте домен клиента и выполните DNS-настройки, которые покажет Vercel. После подключения проверьте canonical URL, sitemap и Google Search Console для нового домена.

## Проверка бронирования

1. Откройте страницу `/booking`.
2. Выберите зал, тариф, дату и время.
3. Заполните имя, телефон, комментарий при необходимости.
4. Подтвердите согласие на обработку данных.
5. Отправьте заявку и проверьте блок "Ваша заявка".
6. Обновите страницу и убедитесь, что заявка восстанавливается.

## Административный режим

Пароль администратора задаётся только через `ADMIN_PASSWORD` в переменных окружения. Не публикуйте пароль в README, клиентском коде, issue, pull request или сообщениях коммитов.

Для входа откройте сайт, нажмите "Вход для администратора" в меню и введите пароль из защищённого хранилища проекта. После входа на странице `/booking` появится встроенный список заявок с действиями принять, отклонить, удалить и очистить список.

## Финальная проверка

Перед передачей клиенту проверьте:

- главная, `/about`, `/zones`, `/booking`, `/contacts` открываются без 404;
- `/api/admin/session` без cookie возвращает 401;
- правильный пароль администратора возвращает 200;
- неправильный пароль возвращает 401;
- гость не видит и не вызывает административные действия;
- заявка сохраняется в Supabase;
- статус заявки сохраняется после принятия или отклонения;
- WhatsApp, Instagram, `robots.txt` и `sitemap.xml` доступны.

## Проверки

Перед релизом и передачей выполните:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run handover:check
npm audit
```

`handover:check` проверяет обязательные файлы, безопасный шаблон окружения,
Git-tracked `.env`-файлы, базовую конфигурацию и очевидные признаки секретов.
Скрипт не читает `.env.local`, не подключается к Supabase и ничего не изменяет.

## Безопасность

- Храните production-переменные только в защищённых настройках Vercel и локальном
  `.env.local`, который исключён из Git.
- Не передавайте `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` и
  `ADMIN_SESSION_SECRET` в issue, pull request, обычных чатах или клиентском коде.
- После смены владельца создайте новые секреты, отзовите старые и проверьте доступы.
- Включите двухфакторную аутентификацию для GitHub, Vercel, Supabase и Google.

## Документация по передаче

- [HANDOVER.md](HANDOVER.md) — настройка GitHub, Vercel, Supabase, окружения,
  домена, резервных копий и порядок ручной передачи.
- [TRANSFER_CHECKLIST.md](TRANSFER_CHECKLIST.md) — финальный чек-лист владельца.
