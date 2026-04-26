# GPT Telegram Bot

Telegram-бот с двумя функциями и **доступом по одобрению админа**:
- 💬 **Чат с GPT** (выбор GPT-5 / GPT-5-mini / GPT-5-nano) с памятью контекста
- 🎨 **Генерация изображений** через `gpt-image-2` (соотношение сторон + качество)

Хранение пользователей и истории — локальный SQLite.

---

## Как работает доступ

1. Новый пользователь пишет `/start`.
2. Бот регистрирует заявку и отправляет всем админам (из `ADMIN_IDS`) карточку с кнопками **✅ Одобрить** / **❌ Отклонить**.
3. Пользователь видит сообщение «Заявка отправлена, ожидай одобрения».
4. Когда админ нажимает «Одобрить» — юзер получает уведомление и может пользоваться ботом.
5. Если «Отклонить» — статус `blocked`, юзеру приходит отказ. Изменить решение можно через `/approve <id>` или `/block <id>`.

Админы из `ADMIN_IDS` имеют доступ всегда и автоматически попадают в БД как `approved`.

---

## Быстрый старт (локально)

### 1. Получить токены и ID

- **TELEGRAM_BOT_TOKEN** — напиши [@BotFather](https://t.me/BotFather), команда `/newbot`
- **OPENAI_API_KEY** — https://platform.openai.com/api-keys
- **ADMIN_IDS** — узнай свой Telegram ID у [@userinfobot](https://t.me/userinfobot)

### 2. Запуск

```bash
cd bot
cp .env.example .env
# впиши TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, ADMIN_IDS
npm install
npm run dev
```

---

## Деплой на Railway (с volume для SQLite)

Railway = самый простой хостинг для этого бота.

### 1. Подготовить репозиторий

Запушь папку `bot/` (или весь репозиторий) на GitHub.

### 2. Создать сервис

1. https://railway.app → **New Project** → **Deploy from GitHub repo** → выбери репо.
2. В настройках сервиса (**Settings → Source**) укажи **Root Directory** = `bot` (если бот лежит в подпапке).
3. Railway автоматически подхватит Nixpacks и `railway.json`.

### 3. Добавить Volume

**Это критично** — без volume база `bot.db` будет стираться при каждом деплое.

1. **Service → Settings → Volumes → + New Volume**
2. **Mount Path:** `/data`
3. **Size:** 1 GB (с запасом, реально нужно ~50 MB)

### 4. Переменные окружения

**Service → Variables → Raw Editor**, вставь:

```
TELEGRAM_BOT_TOKEN=твой_токен
OPENAI_API_KEY=твой_ключ
ADMIN_IDS=твой_telegram_id
IMAGE_MODEL=gpt-image-2
DEFAULT_TEXT_MODEL=gpt-5-mini
HISTORY_LIMIT=20
DB_PATH=/data/bot.db
LOG_LEVEL=info
NODE_ENV=production
```

⚠️ `DB_PATH=/data/bot.db` — путь должен совпадать с mount path volume.

### 5. Deploy

Railway сам соберёт (`npm install && npm run build`) и запустит (`npm start`). Логи — в **Deployments → View Logs**. Должно появиться:
```
🤖 Bot starting...
✅ @your_bot is running (long polling)
```

### Обновление бота

Просто пушишь в Git → Railway автодеплоит. БД в `/data` сохраняется между деплоями.

---

## Команды бота

### Для пользователей
- `/start` — главное меню (или заявка на доступ)
- `/menu` — снова показать меню
- `/model` — выбрать модель GPT
- `/text` — режим чата
- `/image` — режим генерации картинок
- `/reset` — очистить историю диалога
- `/help` — подсказка

### Только для админов
- `/users` — список пользователей со статусом (⏳ pending / ✅ approved / 🚫 blocked)
- `/approve <telegram_id>` — выдать доступ
- `/block <telegram_id>` — отозвать доступ

Плюс админы получают карточки заявок с inline-кнопками одобрения / отклонения прямо в чате.

---

## Меню (для одобренных)

```
💬 Текст (GPT)        🎨 Картинка (image-2)
⚙️ Выбрать модель     📐 Настройки картинки
🧹 Сбросить контекст
```

## Настройки изображения

- **1024×1024** — квадрат 1:1
- **1024×1536** — портрет 2:3
- **1536×1024** — ландшафт 3:2

Качество: `low` / `medium` / `high`.

---

## Альтернативный деплой: Docker

```bash
docker build -t gpt-bot .
docker run -d \
  --name gpt-bot \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  gpt-bot
```

Или **pm2** на VPS:
```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name gpt-bot
pm2 save
pm2 startup
```

---

## Структура

```
bot/
├── src/
│   ├── index.ts                # entry point
│   ├── config.ts               # .env + парсинг ADMIN_IDS
│   ├── bot.ts                  # сборка grammY-бота
│   ├── middleware/
│   │   └── access.ts           # guard: pending/approved/blocked
│   ├── handlers/
│   │   ├── start.ts            # /start, /menu, /help
│   │   ├── menu.ts             # callback-кнопки меню
│   │   ├── text.ts             # обработка текста (чат + картинки)
│   │   └── admin.ts            # заявки, /users, /approve, /block
│   ├── openai/                 # OpenAI SDK обёртки
│   ├── db/                     # SQLite репозитории
│   ├── keyboards/              # inline-клавиатуры
│   └── utils/
├── data/                       # bot.db (локально)
├── .env.example
├── Dockerfile
├── railway.json
└── ...
```

## Как работает контекст

История диалога per `chat_id` хранится в `messages`. Перед каждым запросом в OpenAI берутся последние `HISTORY_LIMIT` сообщений. `/reset` чистит историю текущего чата.

## Лицензия

MIT
