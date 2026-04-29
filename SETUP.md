# Zenith Finance — Налаштування

## 1. Firebase Setup

1. Перейди на [Firebase Console](https://console.firebase.google.com)
2. Створи новий проект
3. Додай Web app (`</>` іконка)
4. Скопіюй конфіг

### Увімкни Firestore:
- Firebase Console → Build → Firestore Database → Create database
- Вибери **Start in test mode** (для розробки)
- Вибери регіон (наприклад `europe-west3`)

### Правила Firestore (для розробки):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 2. Конфігурація

```bash
cp .env.example .env
```

Заповни `.env` своїми Firebase даними.

## 3. Запуск

```bash
npm install
npm run dev
```

Відкрий http://localhost:5173

## Структура проекту

```
src/
├── components/
│   ├── Sidebar.jsx          # Бокова навігація
│   ├── TopBar.jsx           # Верхня панель
│   ├── StatCard.jsx         # Картка статистики
│   ├── TransactionRow.jsx   # Рядок транзакції
│   └── EditTransactionModal.jsx  # Модалка редагування
├── hooks/
│   ├── useTransactions.js   # Firebase CRUD для транзакцій
│   └── useCategories.js     # Firebase CRUD для категорій
├── pages/
│   ├── Overview.jsx         # Головна сторінка
│   ├── Transactions.jsx     # Список транзакцій
│   ├── Upload.jsx           # Завантаження PDF
│   ├── Categories.jsx       # Управління категоріями
│   └── Analytics.jsx        # Аналітика та графіки
├── utils/
│   ├── pdfParser.js         # Парсинг PDF statements
│   └── formatters.js        # Форматування дат, валют
└── firebase.js              # Firebase конфігурація
```

## Підтримувані банки Румунії

- BCR (Banca Comercială Română)
- BRD (Groupe Société Générale)
- ING Bank
- Raiffeisen Bank
- Banca Transilvania
- UniCredit

> Якщо банк не розпізнається — транзакції все одно витягуються за загальним алгоритмом.
