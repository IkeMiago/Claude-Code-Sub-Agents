# todo-app — Plan Document

**Feature**: todo-app  
**Phase**: Plan  
**Date**: 2026-04-19  
**Author**: Miago  
**Status**: Draft

---

## Executive Summary

| 観点 | 内容 |
|------|------|
| **Problem** | タスクを頭の中だけで管理すると抜け漏れが発生し、締切を守りにくい。 |
| **Solution** | バックエンド不要の軽量 Web アプリで、タスクの作成・完了・期限管理を一元化する。 |
| **Functional UX Effect** | 追加・完了・削除・フィルタ・締切日管理を直感的な UI で提供し、操作コストをゼロに近づける。 |
| **Core Value** | どんな端末でもブラウザを開くだけで使える、インストール不要のパーソナル TODO マネージャー。 |

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

## 1. 要件定義

### 1.1 機能要件

| ID | 機能 | 優先度 |
|----|------|--------|
| FR-01 | タスク追加（テキスト必須、締切日オプション） | Must |
| FR-02 | タスク完了トグル（チェックボックス） | Must |
| FR-03 | タスクテキストのインライン編集（ダブルクリック） | Must |
| FR-04 | タスク削除（×ボタン） | Must |
| FR-05 | 締切日のインライン編集（クリックで date input 表示） | Must |
| FR-06 | 締切日状態の色分け表示（期限超過 / 本日 / 期限内 / 未設定） | Must |
| FR-07 | フィルタ機能（All / Active / Completed） | Must |
| FR-08 | 完了済みタスク一括削除（Clear completed） | Should |
| FR-09 | 残タスク件数表示（N items left） | Should |

### 1.2 非機能要件

| ID | 要件 | 詳細 |
|----|------|------|
| NFR-01 | 永続化 | localStorage を使用し、ページリロード後もデータを保持 |
| NFR-02 | レスポンシブ | 480px 以下でモバイルレイアウトに切り替え |
| NFR-03 | アクセシビリティ | `aria-label` を主要入力・ボタンに付与 |
| NFR-04 | 依存なし | サードパーティライブラリ不使用（Vanilla JS） |
| NFR-05 | 即時起動 | バックエンドサーバー不要、index.html をそのまま開いて使用可能 |

---

## 2. スコープ

### In Scope
- `todo-app/index.html` — マークアップ
- `todo-app/css/style.css` — スタイリング（CSS 変数・レスポンシブ）
- `todo-app/js/app.js` — ストレージ層・ドメイン層・プレゼンテーション層

### Out of Scope
- バックエンド API / データベース
- ユーザー認証・マルチユーザー対応
- 複数タブ間のリアルタイム同期
- PWA / Service Worker
- テストコード（別フェーズで対応）

---

## 3. アーキテクチャ概要

```
todo-app/
├── index.html          # エントリーポイント・マークアップ
├── css/
│   └── style.css       # CSS 変数ベースのテーマ・レイアウト
└── js/
    └── app.js          # IIFE 内で3層分離
        ├── ストレージ層   loadTodos / saveTodos (localStorage)
        ├── ドメイン層     todos 配列・CRUD 関数・フィルタ
        └── プレゼンテーション層  render / createItem / startTextEdit 等
```

**設計方針**: IIFE によるグローバル汚染防止、DOM 操作は `render()` による全再描画方式（仮想 DOM なし）。

---

## 4. データモデル

```js
// Todo オブジェクト
{
  id:        string,   // crypto.randomUUID() or fallback
  text:      string,   // タスクテキスト（空文字不可）
  completed: boolean,  // 完了フラグ
  createdAt: number,   // Date.now()
  deadline:  string,   // "YYYY-MM-DD" or "" (未設定)
}
```

**ストレージキー**: `"todo-app:todos"` (localStorage)

---

## 5. UI 構成

```
┌──────────────────────────────┐
│           TODO               │  ← ヘッダー（h1）
├──────────────────────────────┤
│ [入力欄]          [追加]     │  ← todo-form（.todo-form-main）
│ 締切日: [日付選択]           │  ← .todo-form-deadline
├──────────────────────────────┤
│ ☑ タスクテキスト  期限: X月Y日│  ← .todo-item（完了済みは打ち消し線）
│ □ タスクテキスト  期限を設定  │
│ ...                          │
├──────────────────────────────┤
│ N items left  All Active Comp│  ← .todo-footer
│               Clear completed│
└──────────────────────────────┘
```

---

## 6. 締切日ロジック

| 状態 | 条件 | 表示色 |
|------|------|--------|
| `overdue` | deadline < 今日 | 赤（`--color-danger`） |
| `today` | deadline = 今日 | オレンジ（太字） |
| `upcoming` | deadline > 今日 | 緑 |
| `no-deadline` | deadline = "" | グレー（斜体） |

タイムゾーンずれ防止のため `new Date(year, month-1, day)` で構築し、`setHours(0,0,0,0)` でローカル正午基準で比較。

---

## 7. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| localStorage 容量上限（通常 5MB） | 低 | try/catch で無視（個人用途では実用上問題なし） |
| 複数タブ間の状態不整合 | 低 | スコープ外として明示（SharedWorker / BroadcastChannel は対象外） |
| iOS での `<input type="date">` 表示差異 | 中 | ネイティブ日付ピッカーを使用するため許容範囲内 |
| ブラウザ間の `crypto.randomUUID()` 非対応 | 低 | `Date.now() + Math.random()` フォールバック実装済み |

---

## 8. 成功基準

| ID | 基準 | 確認方法 |
|----|------|----------|
| SC-01 | タスクの追加・完了・削除・テキスト編集が正常動作する | 手動操作 |
| SC-02 | 締切日の設定・編集・色分け表示が正常動作する | 手動操作 |
| SC-03 | ページリロード後もタスクが保持される | リロード確認 |
| SC-04 | 480px 幅でモバイルレイアウトが崩れない | DevTools レスポンシブ確認 |
| SC-05 | 空テキストでタスクが追加されない | バリデーション確認 |

---

## 9. 実装状況

> この Plan は**既存実装の文書化**として作成されています。  
> `todo-app/` ディレクトリの実装は完了済みであり、上記の全成功基準を満たしています。

| フェーズ | 状態 |
|----------|------|
| Plan | ✅ 完了（本ドキュメント） |
| Design | ⏳ 未作成 |
| Do | ✅ 実装済み |
| Check | ⏳ 未実施 |
| Report | ⏳ 未作成 |

---

## 10. 参考

- 実装: `todo-app/js/app.js`
- スタイル: `todo-app/css/style.css`
- エントリー: `todo-app/index.html`
