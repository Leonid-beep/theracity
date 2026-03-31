# TheraCity

Городской фотопроект на Next.js (App Router) с авторизацией, галереей, маршрутами и загрузкой фото.

## Стек

- `next` (App Router) + `react`
- Route Handlers в `app/api/**`
- `prisma` + PostgreSQL
- S3-совместимое хранилище (Yandex Object Storage)
- JWT-сессии через `jose` + cookie
- SMTP для восстановления пароля (опционально)

## Локальный запуск

1. Установите зависимости:
   ```bash
   npm install
   ```
2. Создайте `.env` на основе `.env.example`.
3. Сгенерируйте Prisma Client:
   ```bash
   npm run prisma:generate
   ```
4. Примените миграции:
   ```bash
   npm run db:migrate
   ```
5. Запустите проект:
   ```bash
   npm run dev
   ```

Если вы запускаете production-сборку локально через `npm run build && npm run start` по обычному `http://`, при проблемах с повторной авторизацией задайте `AUTH_COOKIE_SECURE=false`.

## Обязательные env-переменные

См. `.env.example`.

Обязательно для production:

- `DATABASE_URL`
- `JWT_SECRET`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`
- `ADMIN_EMAIL`

Опционально (только для восстановления пароля):

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

## Подготовка PostgreSQL

1. Создайте удаленную PostgreSQL БД.
2. Возьмите connection string и заполните `DATABASE_URL`.
3. Для облачных БД обычно нужен SSL (`sslmode=require`).
4. Примените миграции:
   ```bash
   npm run prisma:migrate:deploy
   ```

## Подготовка S3

1. Создайте bucket в S3-совместимом хранилище.
2. Создайте ключ доступа (Access Key / Secret Key).
3. Заполните:
   - `S3_ENDPOINT`
   - `S3_REGION`
   - `S3_ACCESS_KEY`
   - `S3_SECRET_KEY`
   - `S3_BUCKET`
4. Проверьте права ключа: чтение/запись/удаление объектов в выбранном bucket.

## Prisma generate и migrations

- Build уже настроен:
  ```bash
  prisma generate && next build
  ```
- Это гарантирует генерацию Prisma Client перед сборкой.
- Production-миграции запускаются отдельно:
  ```bash
  npm run prisma:migrate:deploy
  ```

## Деплой на Vercel через GitHub

1. Запушьте репозиторий на GitHub.
2. В Vercel: **New Project** -> импортируйте репозиторий.
3. В **Environment Variables** добавьте все обязательные env.
4. Build command (если автоопределение не сработает):
   ```bash
   npm run build
   ```
5. Deploy.
6. После успешного деплоя выполните production-миграции (если еще не выполнены):
   ```bash
   npm run prisma:migrate:deploy
   ```

## Что проверить сразу после первого деплоя

- Открывается главная страница и базовая навигация.
- Регистрация / логин / logout работают.
- `/api/auth/me` возвращает пользователя.
- Галерея загружается, фото отдаются через `/api/s3`.
- Админ может загрузить фото (до 4MB), не-админ получает 403.
- Фильтры/маршруты читаются из БД.
- (Опционально) восстановление пароля, если настроен SMTP.

## Типовые ошибки

- **Prisma Client not generated**  
  Проверьте, что build выполняет `prisma generate` (в проекте уже настроено через `npm run build`).

- **Missing `DATABASE_URL`**  
  Добавьте `DATABASE_URL` в env (локально и в Vercel). Проверьте формат строки подключения.

- **Missing `JWT_SECRET`**  
  Добавьте сильный случайный `JWT_SECRET` в env.

- **Повторно запрашивает авторизацию после входа**  
  Если production-сервер открыт по `http://`, проверьте `AUTH_COOKIE_SECURE`. Для локального `next start` без HTTPS используйте `AUTH_COOKIE_SECURE=false`.

- **Missing S3 env (`S3_*`)**  
  Заполните `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`.

- **Upload error / body too large**  
  В MVP серверная загрузка ограничена 4MB. Уменьшите файл или переходите на presigned upload.

- **SMTP not configured**  
  Функция восстановления пароля не отправит письмо без `SMTP_*`.

## Ограничения текущей MVP-версии

- Загрузка файлов идет через серверный `POST /api/photos`.
- Текущий лимит загрузки: **4MB**.
- Для масштабирования следующий шаг: **прямой upload в S3 через presigned URL** (сервер только выдает URL и сохраняет метаданные).
