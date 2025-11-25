import { defineConfig } from 'vite';

export default defineConfig({
  // 相対パスに設定することで、GitHub Pagesのリポジトリ名以下のパスでも
  // Cloudflare Pagesのルートパスでも、どちらでも動作するようにします。
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  }
});
