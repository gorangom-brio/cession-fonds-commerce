import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cession Fonds Commerce",
  description:
    "Application d'aide à la cession de fonds de commerce pour petits commerces en France",
  keywords: ["cession", "fonds de commerce", "juridique", "France"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-border bg-white sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-navy-700 rounded-lg flex items-center justify-center text-white font-bold">
                  CF
                </div>
                <span className="text-xl font-semibold text-navy-900">
                  Cession Fonds Commerce
                </span>
              </a>
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          <footer className="border-t border-border bg-gray-50 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="font-semibold text-navy-900 mb-3">
                    À propos
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Cession Fonds Commerce est un outil d'aide à la rédaction
                    pour les petits commerces en France.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-navy-900 mb-3">Mentions</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      <a
                        href="#"
                        className="hover:text-navy-700 transition-colors"
                      >
                        Conditions d'utilisation
                      </a>
                    </li>
                    <li>
                      <a
                        href="#"
                        className="hover:text-navy-700 transition-colors"
                      >
                        Politique de confidentialité
                      </a>
                    </li>
                    <li>
                      <a
                        href="#"
                        className="hover:text-navy-700 transition-colors"
                      >
                        RGPD
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-navy-900 mb-3">Aide</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      <a
                        href="#"
                        className="hover:text-navy-700 transition-colors"
                      >
                        FAQ
                      </a>
                    </li>
                    <li>
                      <a
                        href="#"
                        className="hover:text-navy-700 transition-colors"
                      >
                        Contact
                      </a>
                    </li>
                    <li>
                      <a
                        href="#"
                        className="hover:text-navy-700 transition-colors"
                      >
                        Avocat référent
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-border text-sm text-muted-foreground text-center">
                <p>
                  © 2026 Cession Fonds Commerce. Outil d'aide uniquement - non
                  applicable à la place d'un conseil juridique professionnel.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
