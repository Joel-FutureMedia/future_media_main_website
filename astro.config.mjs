import { defineConfig } from 'astro/config';

function devHtmlRoutes() {
  return {
    name: 'dev-html-routes',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, query = ''] = (req.url || '').split('?');
        const match = path.match(/^\/([A-Za-z0-9-]+)\.html$/);
        if (match) {
          const page = match[1] === 'index' ? '/' : `/${match[1]}`;
          req.url = query ? `${page}?${query}` : page;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file'
  },
  vite: {
    plugins: [devHtmlRoutes()]
  }
});
