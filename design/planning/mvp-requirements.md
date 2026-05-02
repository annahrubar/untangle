# MVP requirements: Untangle

Воркшоп 02.05.2026. Час coding: ~3 години (Раунд 1 + Раунд 2). Scope узгоджений з Anna.

## In MVP — Раунд 1 coding (до 12:45)

### Core flow

1. **Brain-dump input** — multi-line textarea, повна ширина центральної колонки. Placeholder підказує приклад використання.

2. **AI parsing → tasks з опційними sub-tasks** — користувач натискає "Untangle", запит йде на `/api/parse`. System prompt просить AI повернути JSON array з обʼєктами {title, priority, deadline, subtasks: [...]}. Логіка AI:
   - Якщо текст звучить як одна складна задача з логічними підкроками ("підготуватись до зустрічі — зробити презентацію і додати людей") → повертає 1 parent з 2-3 sub-tasks
   - Якщо текст містить непов'язані задачі ("текст Славі, Q2 plan, подарунок мамі") → повертає кілька окремих parent задач без sub-tasks
   - AI сам вирішує яка структура краща — це і є smart proposition

3. **Preview з чекбоксами** — після парсингу показуються всі розпарсені задачі як список карток. Sub-tasks показуються як indented дочірні картки під parent. Чекбокси на parent і на кожному sub-task окремо — користувач може вибрати які зберігати. Якщо знімає parent — sub-tasks теж знімаються автоматично. Кнопка "Save selected" внизу.

4. **Save → list of tasks** — обрані задачі пишуться в Postgres через Prisma. UI оновлюється — нові картки зʼявляються в основному списку.

5. **Task cards** — кожна задача показує priority dot, title, deadline (relative format: "Today", "Tomorrow", "Fri 5 PM", або "No deadline"), checkbox.

6. **Toggle done/undone** — клік по чекбоксу перемикає стан в БД. Готова задача отримує line-through і fade-out стилі (не зникає одразу).

7. **Delete** — кнопка delete на картці (icon-only, зʼявляється на hover на desktop, завжди видна на mobile). Видаляє запис з БД.

### Persistence

- **Vercel Postgres (Neon)** через Prisma
- Schema: одна таблиця Task з self-relation для sub-tasks
  ```prisma
  model Task {
    id        String    @id @default(cuid())
    rawInput  String
    title     String
    priority  String    // high | medium | low
    deadline  DateTime?  // date-only, без часу для спрощення
    done      Boolean   @default(false)
    parentId  String?
    parent    Task?     @relation("Subtasks", fields: [parentId], references: [id], onDelete: Cascade)
    subtasks  Task[]    @relation("Subtasks")
    createdAt DateTime  @default(now())
  }
  ```
- Cascade delete: видаляєш parent → автоматично видаляються sub-tasks
- DATABASE_URL у .env.local і в Vercel Settings → Environment Variables

### Deploy

- Vercel через GitHub auto-deploy
- OPENAI_API_KEY додати у Vercel env variables до першого деплою
- Перевірити що production працює з реального посилання

## In Раунд 2 / полірування (до 14:30)

### Killer feature — "What should I do now?"

- Floating button bottom-right of viewport
- Натискання → запит на `/api/recommend` з усіма активними задачами
- AI повертає top 3 з обґрунтуванням ("Цe має deadline сьогодні", "Це коротка задача — швидко закриєш", "Це блокує інші задачі")
- Результат показується в bottom sheet або модалці

### Polish

- Empty state з ілюстрацією і копірайтингом ("Nothing on your mind yet. Drop your first thought above.")
- Hover states на картках (translateY -2px, soft shadow)
- Transitions 200ms ease на всі state changes
- Focus rings для accessibility
- Mobile responsive перевірка (375px viewport)
- Anti-AI-slop check (gradients, generic shadows, центрований текст всюди)

## Out of MVP

Не робимо у воркшоп-день навіть якщо лишиться час — повернемось після:

- Inline edit задачі (delete + re-add як заміна)
- Sub-tasks ієрархія (вимагає зміни schema parentId)
- Filter active/done (можна додати якщо лишиться час)
- Sort by deadline / priority
- Категорії / теги
- User accounts / авторизація
- Notifications
- Analytics

## Технічний стек (затверджено умовами воркшопу)

- Next.js 15+ App Router + TypeScript
- Tailwind CSS
- Prisma ORM з provider postgresql
- Vercel Postgres (Neon)
- OpenAI GPT-4o mini для parsing і recommendations
- Vercel deploy

## API routes

- `POST /api/parse` — приймає {text}, повертає {tasks: Task[]}
- `POST /api/tasks` — створити задачу (одну або кілька з array)
- `GET /api/tasks` — отримати всі задачі поточного користувача
- `PATCH /api/tasks/:id` — toggle done
- `DELETE /api/tasks/:id` — видалити
- `POST /api/recommend` — Раунд 2: повертає top 3 рекомендації

## UI компоненти потрібні

- Top bar (logo + avatar)
- Hero (welcome + subtext)
- BrainDumpInput (textarea + Untangle button)
- ParseResultsPreview (список preview карток з чекбоксами + Save selected)
- TaskList (header + filter pills + список TaskCard)
- TaskCard (priority dot + title + deadline + checkbox + delete)
- EmptyState (Раунд 2)
- WhatNowButton (Раунд 2)
- WhatNowPanel (Раунд 2)
