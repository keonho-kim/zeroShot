<div align="center">
  <h1>ZeroShot</h1>
  <p><strong>Bun + TypeScript 기반의 운영형 Codex CLI 래퍼와 웹 콘솔</strong></p>
</div>

## 개요

ZeroShot은 TypeScript 기반 Codex 파이프라인 runner 위에 다음 두 가지 제품 표면을 제공하는 모노레포입니다.

- CLI: `zeroshot build`, `zeroshot update`
- Web Console: Login / Home / Build / Update / Logs / Editor / Settings

v1의 핵심 원칙은 다음과 같습니다.

- 실제 build/update 실행 엔진은 `cli/src/pipeline`의 TypeScript runner
- CLI와 Web Console은 `Bun + TypeScript`로 제공
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
|-- zeroshot.app.toml
`-- Makefile
```

### `cli`

- `zeroshot build --project-root <abs-path>`
- `zeroshot update --project-root <abs-path>`
- 선택한 프로젝트 루트에 대해 TypeScript pipeline runner를 실행

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
  - bootstrap root는 시스템 홈 디렉터리로 고정
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
- Login 페이지를 통해 저장할 `auth.json` 또는 이미 준비된 `~/.codex/auth.json`

### 설치

```bash
bun install
```

### 릴리스 설치

GitHub release가 생성된 뒤에는 다음 명령으로 CLI를 설치할 수 있습니다.

```bash
curl -fsSL https://github.com/keonho-kim/zeroShot/releases/download/v.dev.3/install.sh | sh
```

installer는 Termux, Linux, WSL, proot, macOS에서 arm64와 x64를 확인합니다.
Termux에서는 Bun이 미리 설치되어 있어야 하며, 다른 환경에서는 Bun이 없으면 공식 Bun installer를 실행합니다.

또는 release tarball을 Bun으로 직접 전역 설치할 수 있습니다.

```bash
bun install -g https://github.com/keonho-kim/zeroShot/releases/download/v.dev.3/zeroShot-dev.3.tgz
```

설치 후에는 `zeroshot` 명령을 사용합니다.

```bash
zeroshot start
zeroshot build --project-root /absolute/project/path
zeroshot update --project-root /absolute/project/path
```

`zeroshot start`는 설치된 tarball 안의 빌드 산출물만 실행합니다. 설치 후 추가 `bun run build`는 필요하지 않습니다.
처음 실행하면 `~/.zeroshot/config.toml`이 생성되고, CLI는 접속 가능한 주소와 포트를 출력합니다.

기본값은 로컬 전용입니다.

```toml
host = "127.0.0.1"
port = 3000
```

홈서버, 서비스 서버, Tailscale 같은 사설망에서 접속하려면 다음처럼 바인딩 주소를 열 수 있습니다.

```toml
host = "0.0.0.0"
port = 3000
```

또는 일회성으로 실행할 수 있습니다.

```bash
zeroshot start --host 0.0.0.0 --port 3000
```

### 타입체크

```bash
bun run check
```

### 빌드

```bash
bun run build
```

### 릴리스 생성

`v.dev.<number>` 또는 `v*.*.*` 태그를 푸시하면 GitHub Actions가 CLI, backend, frontend를 빌드하고 release asset을 생성합니다.
같은 태그의 release가 이미 있으면 asset과 release notes를 갱신합니다.

```bash
git tag v.dev.3
git push origin v.dev.3
```

릴리스 워크플로는 다음 asset을 업로드합니다.

- `zeroShot-dev.3.tgz`
- `install.sh`

### 개발 서버

한 번에 실행:

```bash
bun run dev
```

bootstrap root는 시스템 홈 디렉터리로 고정됩니다.

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
bun run serve
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

### `~/.zeroshot/config.toml`

앱 전용 설정 파일입니다.

```toml
host = "127.0.0.1"
port = 3000
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
  -v ~/dev/test/zeroShot/root:/root \
  zeroshot
```

기본 설정은 시스템 홈 디렉터리를 bootstrap root로 사용합니다.

`auth.json`을 컨테이너 재시작 후에도 유지하려면:

```bash
docker run \
  -p 3000:3000 \
  -v ~/dev/test/zeroShot/root:/root \
  zeroshot
```

그 다음 Login 페이지에서 `auth.json`을 업로드하면 됩니다.

## 커스텀 가이드

아래 예시는 당신이 사용하는 로컬 디렉터리 레이아웃을 그대로 반영합니다.

```text
~/dev/test/zeroShot/
`-- root
    |-- .codex
    `-- workspace
```

### 역할

- `~/dev/test/zeroShot/root`
  - 컨테이너의 `/root`로 마운트
  - Login 페이지에서 업로드한 `auth.json`은 최종적으로 `~/dev/test/zeroShot/root/.codex/auth.json`에 저장됨
  - Settings 페이지에서 수정한 `config.toml`도 `~/dev/test/zeroShot/root/.codex/config.toml`에 반영됨
- `~/dev/test/zeroShot/root/workspace`
  - 컨테이너의 `/root/workspace`로 보이는 작업 디렉터리 예시
  - UI에서 프로젝트로 허용할 수 있는 작업 디렉터리 예시
  - `PRODUCT.md`, `UPDATE.md`, `.work.history`가 이 경로 아래 프로젝트들에 생성됨

### 권장 준비

```bash
mkdir -p ~/dev/test/zeroShot/root/.codex
mkdir -p ~/dev/test/zeroShot/root/workspace
```

### 권장 실행

```bash
docker build --no-cache -f docker/Dockerfile -t zeroshot .
docker run --rm \
  -p 3000:3000 \
  -v ~/dev/test/zeroShot/root:/root \
  zeroshot
```

### 실행 후 흐름

1. 브라우저에서 `http://localhost:3000` 접속
2. `Login` 페이지에서 `auth.json` 업로드
3. 업로드된 파일은 호스트의 `~/dev/test/zeroShot/root/.codex/auth.json`에 저장
4. `Home`에서 프로젝트 선택 모달을 열고 `/root/workspace` 아래 프로젝트를 선택
5. 실행 결과는 해당 프로젝트 내부 `.work.history`에 기록

### 예시 프로젝트 경로

예를 들어 호스트에 아래 디렉터리가 있으면:

```text
~/dev/test/zeroShot/root/workspace/my-app
```

컨테이너/UI 기준으로는 다음 경로로 보입니다.

```text
/root/workspace/my-app
```

이 프로젝트에서 Build를 실행하면 결과는 호스트 기준으로 여기에 쌓입니다.

```text
~/dev/test/zeroShot/root/workspace/my-app/.work.history
```

## 참고

- Monaco는 CDN 없이 로컬 worker 번들로 동작합니다.
- 프런트 번들 크기는 Monaco worker 때문에 큽니다.
- build/update 오케스트레이션은 TypeScript runner가 담당하며, `.work.history` 출력 계약은 유지합니다.
