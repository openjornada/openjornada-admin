import { appConfig } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="py-4 px-6 border-t border-border bg-card">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {appConfig.appName}. Todos los derechos reservados.
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://www.opentracker.es/legal/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Privacidad
          </a>
          <span>·</span>
          <a
            href="https://www.opentracker.es/legal/aviso-legal"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Aviso Legal
          </a>
          <span>·</span>
          <span>Licencia AGPL-3.0</span>
        </div>
      </div>
    </footer>
  );
}
