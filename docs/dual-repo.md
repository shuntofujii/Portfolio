# 二系統リポジトリ（非公開の開発用 / 公開の本番用）

日常の開発は非公開のリポジトリで行い、公開してよい commit だけを公開リポジトリ（本番配置の元）へ送る。この文書は設計と手順の決まりをまとめたもの。

## 段階（phase）

| 段階 | 内容 | 状態 |
| --- | --- | --- |
| phase 1 | この文書の追加と `.gitignore` への `.env.*` の追加、公開ひな形を `env.example` にリネーム | 実施済み |
| phase 2 | 非公開リポジトリの作成、remote の改名、非公開側への初回 push、`projects.json` の更新、Worker の移行 | 実施済み |
| phase 3 | 公開 main への release の push | **未実施。別依頼での承認が要る** |

- phase の各作業は、この文書があるだけでは始めない。依頼ごとに承認を得てから行う。

## 現状（2026-11-01）

- 非公開リポジトリ `shuntofujii/Portfolio-dev` は、エージェントが `gh repo create --private`（`--source` / `--push` なし）で作成した。
- remote は切り替え済み（共有の git 設定のため、本体と worktree で同じ）。
  - `origin`：`https://github.com/shuntofujii/Portfolio-dev.git`（非公開）
  - `public`：`https://github.com/shuntofujii/Portfolio.git`（公開）
- 非公開側へ送った ref（`workflow` 権限追加のあと成功）：
  - 作業ブランチ `agent/20261031-dual-repo-design`（`102abce`）
  - 公開済みの履歴 `refs/remotes/public/main`（`a271ab08415d39662ccf0d4c4b43b1957b751972`）を非公開の `main` へ。ローカルの `main` は送っていない。
- 公開リポジトリの main は変えていない（`a271ab0` のまま）。公開 main への release は未実施。
- 本体 `~/work/Portfolio` の WIP は未コミットのまま触っていない。
- `~/work/_base/config/projects.json` の Portfolio の `repo` は `shuntofujii/Portfolio-dev` に変更済み（`mobile_workspaces` は `["m1"]`）。
- スマホ用作業領域 `~/work/_workspaces/Portfolio/m1` は、非公開の `origin/main`（`a271ab0`）から作った。
- 旧 Worker `cursor-worker@Portfolio`（本体 `~/work/Portfolio` を追跡）は `systemctl --user disable --now` で停止・無効化した。データ `~/.local/share/cursor-agent/workers/Portfolio` は残している。
- Worker の追跡先は `work-worker@Portfolio-m1`（Worker 名 `win-Portfolio`、作業ディレクトリ `~/work/_workspaces/Portfolio/m1`）。`work-worker enable Portfolio m1` で有効化し、起動を確認した。

## リポジトリ

| 役割 | リポジトリ | 公開範囲 |
| --- | --- | --- |
| 開発用（日常の PR・作業ブランチ・Worker） | `shuntofujii/Portfolio-dev` | Private |
| 本番用（GitHub Pages への配置の元） | `shuntofujii/Portfolio` | Public |

### 非公開リポジトリ `shuntofujii/Portfolio-dev` の作り方（phase 2）

作り方の型は `~/work/_base/docs/github-private-repo.md` に合わせる。今回はエージェントが下の決まりで作成した（作成済み）。

- **空のリポジトリ**にする。「Add a README file」「Add .gitignore」「Choose a license」は **すべて付けない**（ローカルの履歴をそのまま push するため）。
- **Visibility は Private**。
- コマンドで作るときは `--private` を必ず付け、`--source` や `--push` は付けない。
- 作成後、エージェントは `gh repo view shuntofujii/Portfolio-dev --json visibility` で `PRIVATE` であることを確かめてから push する。非公開でなければ push しない。
- Settings の「Change repository visibility」で Public にしない。Fork・GitHub Pages を有効にしない。Collaborators は中身を見直してから追加する。

## remote の目標（phase 2）

| remote 名 | URL |
| --- | --- |
| `origin` | `https://github.com/shuntofujii/Portfolio-dev.git`（非公開） |
| `public` | `https://github.com/shuntofujii/Portfolio.git`（公開） |

切り替えの順序：

1. 今の `origin`（公開 URL）を **先に `public` へ改名する**。公開 URL を消さない（`git remote remove` や `set-url` で上書きしない）。
2. そのあとで、非公開 URL を `origin` として追加する。
3. 両方の URL を `git remote -v` で確かめる。

## 日常の追跡先

- 日常の PR、`work-branch`、Worker（My Machines）の追跡先は **`origin`（非公開）**。
- `work-branch` は `origin/main` を取得して作業ブランチを切る。remote の切り替え後は、非公開の main が起点になる。
- `~/work/_base/config/projects.json` の Portfolio の `repo` は `shuntofujii/Portfolio-dev`（変更済み）。
- Worker（My Machines）は `work-worker@Portfolio-m1` で、m1 は非公開の `origin/main` から作る。

## 本番への反映

- 本番への反映は、**非公開 main の自動ミラーではない**。**非公開 main を契機に動く GitHub Action でもない**。
- 公開してよい commit に **`release/YYYYMMDD`** のタグを付け、下の denylist をすべて満たすときだけ、公開リポジトリ（`public`）の main をその commit へ **fast-forward** する。
- 公開リポジトリの main への push は、`.github/workflows/deploy.yml` が動く **本番への配置** にあたる。進める前に承認を得る。
- プロジェクトの hooks は main への `git push` を止める。**hooks を GitHub API や別の refspec で回避しない**。止まったら報告し、承認を得た手順で進める。

## denylist（公開側へ送る commit の条件）

公開側へ送る commit と、**その祖先すべて** が次を満たすこと。

- `.env`、`.env.*`、認証情報（トークン、鍵、パスワードなど）を含まない。
  - 決定：公開ひな形は `env.example` のみ。denylist は `.env` / `.env.*` を例外なしで禁止（ドットで始まる env の example 名は公開ひな形に使わない。例外は設けない）。
- 未追跡の `scripts/serve-dev.py` は、この依頼では追加しない。
- 新しく作った `.cursor/` は、公開用の commit に入れない。
- 既に公開 main にあるファイルの削除や、`deploy.yml` の rsync の除外の変更はしない。
- release のツリーは成果物（`_site` 相当）だけにしない。現行の `deploy.yml` が公開リポジトリの checkout 上で `npm ci`、`node meta-audit.js`、`node scripts/build-project-pages.mjs` を実行できる **ソース一式** を含める（`package.json`、`package-lock.json`、`meta-audit.js`、`scripts/` など）。

## 本体の未コミットの作業（WIP）

- 本体 `~/work/Portfolio` の未コミットの変更は、**commit・移動・stash・reset をしない**。
- 作業ブランチは `origin/main` から切った worktree にあり、WIP をコピーしない。
- `origin` が非公開になってから、WIP を **公開側へ push しないブランチ** に載せる。

## 対象外

- 旧 Worker `cursor-worker@Portfolio` は停止・無効化済み。再び有効にしない。`cursor-worker.sh`、`cursor-worker@.service`、旧 Worker のデータは変えない・消さない。
- `AGENTS.md`、ポートの台帳（`ports`）、`work-dev` は、この依頼に含めない。
- `package.json` の `repository` の URL と `.github/workflows/deploy.yml` は変えない。
