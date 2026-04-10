<div align="center">
  <h1>ZeroShot</h1>
  <p><strong>Bun + TypeScript 기반의 운영형 Codex CLI 래퍼와 웹 콘솔</strong></p>
</div>

## 개요

ZeroShot은 기존 Bash 기반 Codex 파이프라인을 유지하면서, 그 위에 다음 두 가지 제품 표면을 추가한 모노레포입니다.

- CLI: `zeroshot build`, `zeroshot update`
- Web Console: Login / Home / Build / Update / Logs / Editor / Settings

v1의 핵심 원칙은 다음과 같습니다.

- 실제 build/update 실행 엔진은 기존 `scripts/` shell pipeline 유지
- 새 인터페이스는 `Bun + TypeScript`로 제공
- `.work.history` 구조, run naming, manifest, prompt/문서 출력 계약은 기존과 호환 유지
- Codex 인증/설정은 호스트의 `~/.codex`를 직접 사용

## 모노레포 구조

```text
.
|-- cli
|   `-- src
|-- backend
|   `-- src
|-- frontend
|   `-- src
|-- scripts
|   |-- build.sh
|   |-- lib
|   `-- phases
|-- zeroshot.app.toml
`-- Makefile
```

### `cli`

- `zeroshot build --project-root <abs-path>`
- `zeroshot update --project-root <abs-path>`
- 선택한 프로젝트 루트에 대해 기존 shell pipeline을 실행하는 래퍼

### `backend`

- Express.js 기반 API 서버
- 단일 글로벌 job manager
- SSE 로그 스트리밍
- `.work.history`, `~/.codex/auth.json`, `~/.codex/config.toml`, `zeroshot.app.toml` 관리

### `frontend`

- React + Vite
- TanStack Query + Zustand
- Tailwind CSS v4
- shadcn 스타일 UI 컴포넌트
- Monaco Editor 로컬 worker 번들 포함

## 주요 기능

### Login

- `~/.codex/auth.json` 존재 여부와 JSON 파싱 가능 여부만 확인
- auth가 유효하지 않으면 Build/Update 차단
- 필요 시 Login 페이지에서 `auth.json` 업로드 또는 붙여넣기로 컨테이너 내부 `~/.codex/auth.json` 생성

### Build

- 허용된 탐색 루트 하위에서 프로젝트 루트 선택
- `PRODUCT.md` 업로드 또는 직접 작성
- 실행 시 `zeroshot build --project-root <path>` 호출
- 로그를 SSE로 실시간 표시

### Update

- 선택한 프로젝트 루트에 `.work.history` run이 하나 이상 있을 때 활성화
- `PRODUCT.md`, `UPDATE.md` 업로드 또는 직접 작성
- 실행 시 `zeroshot update --project-root <path>` 호출

### Logs

- 선택된 프로젝트 내부 `.work.history`의 run 목록, manifest, 문서 출력 조회

### Editor

- Monaco 기반 편집기
- 프로젝트 루트 이하 파일만 편집 가능
- `.work.history`는 편집 대상에서 제외

### Settings

- `~/.codex/config.toml`
  - model providers
  - profiles
  - 주요 기본 실행 옵션
- `zeroshot.app.toml`
  - bootstrap roots
  - allowed roots
  - 기본 approval/sandbox
  - iteration / reasoning 기본값

## API

백엔드는 다음 API를 제공합니다.

- `GET /api/auth/status`
- `GET /api/projects/tree?path=...`
- `GET /api/projects/state?projectRoot=...`
- `POST /api/build`
- `POST /api/update`
- `GET /api/jobs/current`
- `GET /api/jobs/:jobId/stream`
- `GET /api/history?projectRoot=...`
- `GET /api/history/:runName?projectRoot=...`
- `GET /api/files?projectRoot=...&path=...`
- `PUT /api/files`
- `GET /api/settings/codex`
- `PUT /api/settings/codex`
- `GET /api/settings/app`
- `PUT /api/settings/app`

## 개발

### 요구 사항

- Bun 1.3+
- `codex`
- `python3`
- Login 페이지를 통해 저장할 `auth.json` 또는 이미 준비된 `~/.codex/auth.json`

### 설치

```bash
bun install
```

### 타입체크

```bash
bun run check
```

### 빌드

```bash
bun run build
```

### 개발 서버

한 번에 실행:

```bash
bun run dev
```

bootstrap root 지정:

```bash
bun run dev --root=/absolute/bootstrap/root
```

개별 실행:

터미널 1:

```bash
bun run dev:server
```

터미널 2:

```bash
bun run dev:web
```

프로덕션 서버:

```bash
bun run serve --root=/absolute/bootstrap/root
```

### CLI

```bash
bun run --cwd cli src/index.ts build --project-root /absolute/project/path
bun run --cwd cli src/index.ts update --project-root /absolute/project/path
```

### Makefile 호환

현재 디렉터리를 프로젝트 루트로 보고 실행합니다.

```bash
make build
make update
```

## 설정 파일

### `zeroshot.app.toml`

앱 전용 설정 파일입니다.

```toml
bootstrap_roots = ["/project"]
allowed_roots = []
default_approval = "never"
default_sandbox = "workspace-write"
max_iters = 30
stall_limit = 2
plan_reasoning = "high"
exec_reasoning = "medium"
validate_reasoning = "medium"
closeout_reasoning = "medium"
```

### `~/.codex/config.toml`

UI에서 provider/profile/기본 실행 옵션 일부를 수정합니다.

예시:

```toml
[model_providers.ollama]
name = "Ollama"
base_url = "http://localhost:11434/v1"

[profiles.ollama-local]
model_provider = "ollama"
model = "gpt-oss:20b"
```

## Docker

`docker/Dockerfile`은 backend가 frontend 정적 빌드를 함께 서빙하는 단일 컨테이너 구성을 제공합니다.

실행 시 다음 mount를 권장합니다.

- 호스트 프로젝트 루트들
- 선택 사항: `/root/.codex`용 named volume 또는 host mount

예시 개념:

```bash
docker build --no-cache -f docker/Dockerfile -t zeroshot .
docker run \
  -p 3000:3000 \
  -v ~/dev/test/zeroShot/workspace:/project \
  zeroshot
```

기본 설정은 `/project`를 bootstrap root로 사용합니다.

`auth.json`을 컨테이너 재시작 후에도 유지하려면:

```bash
docker run \
  -p 3000:3000 \
  -v ~/dev/test/zeroShot/root:/root \
  -v ~/dev/test/zeroShot/workspace:/project \
  zeroshot
```

그 다음 Login 페이지에서 `auth.json`을 업로드하면 됩니다.

## 커스텀 가이드

아래 예시는 당신이 사용하는 로컬 디렉터리 레이아웃을 그대로 반영합니다.

```text
~/dev/test/zeroShot/
|-- root
`-- workspace
```

### 역할

- `~/dev/test/zeroShot/root`
  - 컨테이너의 `/root`로 마운트
  - Login 페이지에서 업로드한 `auth.json`은 최종적으로 `~/dev/test/zeroShot/root/.codex/auth.json`에 저장됨
  - Settings 페이지에서 수정한 `config.toml`도 `~/dev/test/zeroShot/root/.codex/config.toml`에 반영됨
- `~/dev/test/zeroShot/workspace`
  - 컨테이너의 `/project`로 마운트
  - UI에서 탐색을 시작하는 bootstrap root의 실제 호스트 위치
  - `PRODUCT.md`, `UPDATE.md`, `.work.history`가 이 경로 아래 프로젝트들에 생성됨

### 권장 준비

```bash
mkdir -p ~/dev/test/zeroShot/root/.codex
mkdir -p ~/dev/test/zeroShot/workspace
```

### 권장 실행

```bash
docker build --no-cache -f docker/Dockerfile -t zeroshot .
docker run --rm \
  -p 3000:3000 \
  -v ~/dev/test/zeroShot/root:/root \
  -v ~/dev/test/zeroShot/workspace:/project \
  zeroshot
```

### 실행 후 흐름

1. 브라우저에서 `http://localhost:3000` 접속
2. `Login` 페이지에서 `auth.json` 업로드
3. 업로드된 파일은 호스트의 `~/dev/test/zeroShot/root/.codex/auth.json`에 저장
4. `Home`에서 프로젝트 선택 모달을 열고 `~/dev/test/zeroShot/workspace` 아래 프로젝트를 선택
5. 실행 결과는 해당 프로젝트 내부 `.work.history`에 기록

### 예시 프로젝트 경로

예를 들어 호스트에 아래 디렉터리가 있으면:

```text
~/dev/test/zeroShot/workspace/my-app
```

컨테이너/UI 기준으로는 다음 경로로 보입니다.

```text
/project/my-app
```

이 프로젝트에서 Build를 실행하면 결과는 호스트 기준으로 여기에 쌓입니다.

```text
~/dev/test/zeroShot/workspace/my-app/.work.history
```

## 참고

- Monaco는 CDN 없이 로컬 worker 번들로 동작합니다.
- 프런트 번들 크기는 Monaco worker 때문에 큽니다.
- v1은 shell pipeline 유지가 우선이며, 추후 TypeScript core로 단계적 이관이 가능합니다.
