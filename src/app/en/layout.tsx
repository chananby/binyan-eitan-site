import { Assistant } from "next/font/google";
import { LangProvider } from "../components/LangContext";

const assistant = Assistant({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={assistant.variable}>
      <LangProvider lang="en" dir="ltr">{children}</LangProvider>
    </div>
  );
}
