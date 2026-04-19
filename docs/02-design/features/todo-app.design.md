# todo-app — Design Document

**Feature**: todo-app  
**Phase**: Design  
**Date**: 2026-04-19  
**Author**: Miago  
**Architecture**: Option C — Pragmatic Balance  
**Status**: Draft

---

## Context Anchor

| Key | Content |
|-----|---------|
| **WHY** | タスク抜け漏れ・締切超過を防ぐ個人向け軽量ツールが必要 |
| **WHO** | 個人ユーザー（デスクトップ・モバイル両用） |
| **RISK** | localStorage 上限超過によるデータ消失、複数タブ間の同期なし |
| **SUCCESS** | CRUD 完全動作・締切日管理・localStorage 永続化・レスポンシブ対応 |
| **SCOPE** | フロントエンドのみ（HTML / CSS / Vanilla JS）、バックエンドなし |

---

## 1. 概要

### 1.1 アーキテクチャ選択理由

**Option C — Pragmatic Balance** を採用。

- IIFE 構造を維持することで `file://` プロトコルでの直接起動を保証
- 関数グループをコメントブロックで明確に分割し、可読性・保守性を向上
- ES Modules（Option B）は `file://` 起動時に CORS エラーが発生するため不採用
- 既存コードの動作を保ちつつ、将来的な機能追加に備えた構造整理

### 1.2 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| マークアップ | HTML5 | セマンティック要素・`aria-label` |
| スタイリング | CSS3 + CSS Variables | テーマ管理・レスポンシブ |
| ロジック | Vanilla JS (ES5 互換) | サードパーティ依存なし |
| 永続化 | localStorage | バックエンド不要 |

---

## 2. ファイル構成

```
todo-app/
├── index.html              # エントリーポイント
├── css/
│   └── style.css           # CSS 変数 + レイアウト + コンポーネント + レスポンシブ
└── js/
    └── app.js              # IIFE — 3層アーキテクチャ
        │
        ├── [ストレージ層]
        │   ├── STORAGE_KEY  定数
        │   ├── loadTodos()  localStorage → Todo[]
        │   └── saveTodos()  Todo[] → localStorage
        │
        ├── [ドメイン層]
        │   ├── todos        状態変数
        │   ├── currentFilter 状態変数
        │   ├── generateId()
        │   ├── addTodo(text, deadline)
        │   ├── toggleTodo(id)
        │   ├── updateTodoText(id, text)
        │   ├── updateTodoDeadline(id, deadline)
        │   ├── deleteTodo(id)
        │   ├── clearCompleted()
        │   └── getFiltered()
        │
        ├── [締切日ユーティリティ]
        │   ├── formatDeadline(dateStr)  → "YYYY年M月D日"
        │   └── getDeadlineStatus(dateStr) → "overdue"|"today"|"upcoming"|null
        │
        ├── [プレゼンテーション層]
        │   ├── render()
        │   ├── createItem(todo)
        │   ├── buildDeadlineElement(todo)
        │   ├── startTextEdit(li, label, todo)
        │   └── startDeadlineEdit(deadlineEl, todo)
        │
        └── [イベント配線]
            ├── form submit → addTodo + render
            ├── filterButtons click → currentFilter + render
            └── clearCompletedBtn click → clearCompleted + render
```

---

## 3. データモデル

### 3.1 Todo エンティティ

```js
{
  id:        string,   // crypto.randomUUID() | "todo-{timestamp}-{random}"
  text:      string,   // 空文字不可、trim 済み
  completed: boolean,
  createdAt: number,   // Date.now() (Unix ms)
  deadline:  string,   // "YYYY-MM-DD" | "" (未設定)
}
```

### 3.2 ストレージスキーマ

```
localStorage["todo-app:todos"] = JSON.stringify(Todo[])
```

**読み込み保護**: `JSON.parse` を try/catch でラップ。パース失敗時は空配列を返す。

### 3.3 状態変数

| 変数 | 型 | 初期値 | 説明 |
|------|----|--------|------|
| `todos` | `Todo[]` | `loadTodos()` | メモリ上の全タスク |
| `currentFilter` | `string` | `"all"` | `"all"` / `"active"` / `"completed"` |

---

## 4. コンポーネント設計

### 4.1 HTML 構造

```
.app-container
├── header > h1 "TODO"
├── form#todo-form.todo-form
│   ├── .todo-form-main
│   │   ├── input#new-todo[type=text]
│   │   └── button.add-btn[type=submit]
│   └── .todo-form-deadline
│       ├── label[for=new-deadline]
│       └── input#new-deadline[type=date]
├── section#todo-list-section.todo-list-section[hidden]
│   └── ul#todo-list
│       └── li.todo-item[data-id] (×N)
│           ├── input[type=checkbox]
│           ├── .todo-content
│           │   ├── label (ダブルクリック → startTextEdit)
│           │   └── span.todo-deadline (クリック → startDeadlineEdit)
│           └── button.delete-btn
└── footer#todo-footer.todo-footer[hidden]
    ├── span#item-count
    ├── .filter-buttons
    │   ├── button[data-filter=all]
    │   ├── button[data-filter=active]
    │   └── button[data-filter=completed]
    └── button#clear-completed[hidden]
```

### 4.2 CSS 変数（デザイントークン）

```css
:root {
  /* カラー */
  --color-primary:       #5b7fff;
  --color-primary-hover: #4a6ee8;
  --color-bg:            #f0f2f5;
  --color-card:          #ffffff;
  --color-text:          #2c3e50;
  --color-text-muted:    #8a94a6;
  --color-border:        #e4e7eb;
  --color-danger:        #e74c3c;
  --color-completed:     #b0b7c3;

  /* 締切日カラー（CSS 変数外で直接定義） */
  /* overdue: var(--color-danger) */
  /* today:   #e67e22 (オレンジ、太字) */
  /* upcoming: #27ae60 (緑) */

  /* タイポグラフィ */
  --font-size-base: 16px;
  --font-size-sm:   13px;
  --font-size-xl:   48px;

  /* スペーシング */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* その他 */
  --radius:     8px;
  --shadow:     0 2px 8px rgba(0,0,0,0.08);
  --shadow-lg:  0 4px 16px rgba(0,0,0,0.1);
  --transition: 0.2s ease-in-out;
}
```

---

## 5. 機能ロジック詳細

### 5.1 CRUD フロー

```
[追加]
  form submit
    → addTodo(text, deadline)
      → trim & 空文字ガード
      → generateId()
      → todos.push(todo)
      → saveTodos()
    → input クリア
    → render()
    → input focus

[完了トグル]
  checkbox change
    → toggleTodo(id)
      → todo.completed = !todo.completed
      → saveTodos()
    → render()

[テキスト編集]
  label dblclick
    → startTextEdit(li, label, todo)
      → input 要素を label に差し替え
      → blur/Enter → updateTodoText(id, text)
          → trim → 空文字なら deleteTodo → render
          → 変更あり → todo.text 更新 → saveTodos → render
      → Escape → render (キャンセル)

[締切日編集]
  .todo-deadline click
    → startDeadlineEdit(deadlineEl, todo)
      → date input を差し替え
      → change/blur → updateTodoDeadline(id, deadline) → saveTodos → render
      → Escape → render (キャンセル)

[削除]
  .delete-btn click
    → deleteTodo(id) → saveTodos → render

[一括削除]
  #clear-completed click
    → clearCompleted() → saveTodos → render
```

### 5.2 フィルタロジック

```
getFiltered()
  "active"    → todos.filter(t => !t.completed)
  "completed" → todos.filter(t => t.completed)
  "all"       → todos.slice()
```

### 5.3 締切日判定ロジック

```
getDeadlineStatus(dateStr)
  today = new Date(); today.setHours(0,0,0,0)
  deadline = new Date(year, month-1, day)  // タイムゾーン安全
  deadline < today  → "overdue"
  deadline === today → "today"
  otherwise         → "upcoming"

formatDeadline("2026-04-19") → "2026年4月19日"
  parts = dateStr.split("-")
  → parts[0] + "年" + parseInt(parts[1]) + "月" + parseInt(parts[2]) + "日"
```

### 5.4 render() の責務

```
render()
  ├── filtered = getFiltered()
  ├── activeCount = todos.filter(!completed).length
  ├── listSection.hidden = todos.length === 0
  ├── footerEl.hidden = todos.length === 0
  ├── itemCountEl.textContent = "{N} item(s) left"
  ├── filterButtons: data-filter === currentFilter → .active クラス
  ├── clearCompletedBtn.hidden = !hasCompleted
  └── ul 再構築: DocumentFragment + forEach(createItem)
```

---

## 6. レスポンシブ設計

| ブレークポイント | 変更内容 |
|----------------|----------|
| `> 480px` | 標準レイアウト、`max-width: 560px` 中央寄せ |
| `≤ 480px` | body padding 縮小、h1 縮小、`.deadline-form-label` 非表示、`.delete-btn` 常時表示、footer 縦並び |

---

## 7. エラーハンドリング

| ケース | 対処 |
|--------|------|
| localStorage 読み込み失敗 | try/catch → `[]` を返す |
| localStorage 書き込み失敗 | try/catch → 無視（個人用途） |
| 空テキスト追加 | `addTodo()` 内で `trim()` 後に `null` return → 追加しない |
| 空テキスト編集確定 | `updateTodoText()` → `deleteTodo()` に委譲 |
| 不正 dateStr | `getDeadlineStatus()` で falsy check → `null` return |

---

## 8. テスト計画

| ID | シナリオ | 期待結果 |
|----|---------|---------|
| TC-01 | テキストを入力して追加ボタンクリック | リストに表示、入力欄クリア |
| TC-02 | 空テキストで追加 | 追加されない |
| TC-03 | チェックボックスクリック | 打ち消し線・完了スタイル適用 |
| TC-04 | タスクテキストをダブルクリック編集 | 変更が反映される |
| TC-05 | 締切日をクリックして変更 | 日付更新・色変化 |
| TC-06 | 削除ボタンクリック | リストから消える |
| TC-07 | Active フィルタ | 未完了のみ表示 |
| TC-08 | Clear completed | 完了済み全削除 |
| TC-09 | ページリロード | タスクが保持される |
| TC-10 | 480px 幅 | レイアウト崩れなし |

---

## 9. 依存関係・制約

- **ブラウザ要件**: localStorage + `crypto.randomUUID()`（フォールバックあり）
- **サーバー不要**: `file://` 直接起動対応（ES Modules 不使用が必須条件）
- **外部依存**: なし

---

## 10. 既存実装との対応表

| 設計要素 | 実装ファイル | 行 |
|---------|------------|-----|
| ストレージ層 | `js/app.js` | 8–20 |
| ドメイン層 | `js/app.js` | 22–100 |
| 締切日ユーティリティ | `js/app.js` | 102–120 |
| プレゼンテーション層 | `js/app.js` | 122–250 |
| イベント配線 | `js/app.js` | 252–285 |
| CSS 変数 | `css/style.css` | 1–35 |
| レスポンシブ | `css/style.css` | 末尾 `@media` |

---

## 11. 実装ガイド

### 11.1 実装順序

1. `index.html` — セマンティックマークアップ・aria 属性
2. `css/style.css` — CSS 変数定義 → ベーススタイル → コンポーネント → レスポンシブ
3. `js/app.js` — ストレージ層 → ドメイン層 → ユーティリティ → プレゼンテーション層 → イベント配線

### 11.2 実装チェックリスト

- [ ] FR-01: addTodo (空文字ガード込み)
- [ ] FR-02: toggleTodo + render
- [ ] FR-03: startTextEdit (Enter/Escape/blur)
- [ ] FR-04: deleteTodo
- [ ] FR-05: startDeadlineEdit (change/Escape/blur)
- [ ] FR-06: getDeadlineStatus + CSS クラス付与
- [ ] FR-07: currentFilter + getFiltered + filter button UI
- [ ] FR-08: clearCompleted + clearCompletedBtn 表示制御
- [ ] FR-09: activeCount 表示
- [ ] NFR-01: loadTodos / saveTodos (try/catch)
- [ ] NFR-02: @media 480px
- [ ] NFR-03: aria-label on inputs/buttons

### 11.3 Session Guide

#### Module Map

| Module | 担当ファイル | 概要 |
|--------|------------|------|
| M1: HTML | `index.html` | マークアップ・フォーム・リスト構造 |
| M2: CSS | `css/style.css` | 変数・レイアウト・コンポーネント・レスポンシブ |
| M3: Storage+Domain | `js/app.js` (前半) | ストレージ層・ドメイン層・ユーティリティ |
| M4: Presentation | `js/app.js` (後半) | render・createItem・インライン編集・イベント |

#### 推奨セッションプラン

| Session | Scope | 目標 |
|---------|-------|------|
| Session 1 | M1, M2 | HTML + CSS 完成（静的表示確認） |
| Session 2 | M3 | ストレージ・ドメインロジック完成（コンソールで動作確認） |
| Session 3 | M4 | UI 描画・イベント配線完成（ブラウザで全機能確認） |

```bash
# セッション指定で実装
/pdca do todo-app --scope M1,M2
/pdca do todo-app --scope M3
/pdca do todo-app --scope M4
```
