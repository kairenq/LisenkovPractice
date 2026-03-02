# IS "Учет расходуемого материала"

Учебная desktop-ИС на **Electron + React + SQLite**.

## Реализовано по TODO
- Монорепо: `apps/desktop` + `packages/shared`.
- Авторизация, роли и доступ (RBAC).
- Справочник материалов: CRUD + поиск/фильтр/сортировка + валидации.
- Учет прихода/расхода с запретом списания выше остатка.
- Таблица остатков + фильтр по низкому остатку.
- Отчеты:
  - операции за период;
  - остатки на дату;
  - экспорт CSV и печать/PDF через системное окно печати.
- Управление пользователями (CRUD + сброс пароля админом).
- Audit log действий.
- Обработчик ошибок БД.
- Seed тестовых данных (пользователи + стартовые материалы и операции).
- GitHub Actions: lint/test/build/package Windows `.exe`, upload artifact, draft release по тегу.

## Экраны для отчета (есть в UI)
- Окно авторизации.
- Главное окно.
- Добавление материала.
- Результат добавления.
- Ошибка валидации/неверного логина.
- Ошибка БД/подключения.

## Запуск
```bash
npm install
npm run build -w @shared/core
npm run dev -w @app/desktop
```

## Сборка `.exe`
```bash
npm run package -w @app/desktop
```

Артефакты: `apps/desktop/release`.

## Демо-учетки
- `admin / admin123`
- `kladovshik / 123456`
- `buhgalter / 123456`
- `rukovoditel / 123456`


## Как исправить ошибку npm `403 Forbidden`
Если `npm install` падает с `403` при обращении к `registry.npmjs.org`, это почти всегда ограничение прокси/сети.

1. Проверка доступа:
   ```bash
   npm run doctor:npm
   ```
2. Если снова `403`, нужно:
   - либо открыть доступ к `registry.npmjs.org` в вашем прокси;
   - либо использовать внутренний npm-mirror и настроить его:
     ```bash
     npm config set registry <URL_вашего_внутреннего_registry>
     npm install
     ```
