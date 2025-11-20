import { defineConfig } from 'vite';

export default defineConfig({
  // 相対パスに設定することで、GitHub Pagesのリポジトリ名以下のパスでも
  // Cloudflare Pagesのルートパスでも、どちらでも動作するようにします。
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // ソースマップを出力しておくと、デバッグ時に元のファイル位置がわかります（任意）
    sourcemap: true,
  }
});
