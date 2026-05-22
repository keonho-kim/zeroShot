import { defineTranslations } from "@/lib/i18n/define-translations";

export const loginTranslations = defineTranslations({
  en: {
    "login.kicker": "Codex sign-in",
    "login.title": "Add your Codex auth file first",
    "login.description": "ZeroShot checks only the app-local ~/.codex/auth.json file.",
    "login.path": "Path",
    "login.checking": "Checking...",
    "login.loadingStatus": "Loading sign-in status.",
    "login.saving": "Saving...",
    "login.submit": "Log in",
    "login.savedWhere": "The uploaded content is saved as ~/.codex/auth.json inside this app."
  },
  ko: {
    "login.kicker": "Codex 로그인",
    "login.title": "Codex 인증 파일을 먼저 준비하세요",
    "login.description": "ZeroShot은 앱 내부의 ~/.codex/auth.json 파일만 확인합니다.",
    "login.checking": "확인 중...",
    "login.loadingStatus": "로그인 상태를 불러오고 있습니다.",
    "login.saving": "저장 중...",
    "login.submit": "로그인",
    "login.savedWhere": "업로드한 내용은 이 앱 안의 ~/.codex/auth.json으로 저장됩니다."
  },
  zh: {
    "login.title": "请先添加 Codex 认证文件",
    "login.description": "ZeroShot 只检查应用内的 ~/.codex/auth.json。"
  },
  ja: {
    "login.title": "まず Codex 認証ファイルを追加してください",
    "login.description": "ZeroShot はアプリ内の ~/.codex/auth.json だけを確認します。"
  },
  es: {
    "login.title": "Añade primero tu archivo de autenticación de Codex",
    "login.description": "ZeroShot solo revisa el archivo ~/.codex/auth.json dentro de la app."
  },
  de: {
    "login.title": "Füge zuerst deine Codex-Auth-Datei hinzu",
    "login.description": "ZeroShot prüft nur die app-interne Datei ~/.codex/auth.json."
  }
});
