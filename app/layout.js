import "./globals.css";
import Header from "@/components/Header";

export const metadata = {
  title: "Annuaire Liberty Art",
  description: "Annuaire des élèves de Liberty Art",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
