import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

// Language
import English from "../../language/en.json";
import Japanese from "../../language/ja.json";
import TraditionalChinese from "../../language/zh-TW.json";

export const languageLookup: Record<
  string,
  Record<string, Record<string, string>>
> = {
  en_US: English,
  ja_JP: Japanese,
  zh_TW: TraditionalChinese,
};

// Language Context
interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  currentLanguageLookup: Record<string, Record<string, string>>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

// Language Provider Component
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>("en_US");
  const [currentLanguageLookup, setCurrentLanguageLookup] = useState<
    Record<string, Record<string, string>>
  >(languageLookup["en_US"]);

  // Initialize language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("preferred-language");
    if (savedLanguage && languageLookup[savedLanguage]) {
      setLanguageState(savedLanguage);
      setCurrentLanguageLookup(languageLookup[savedLanguage]);
    }
  }, []);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    setCurrentLanguageLookup(languageLookup[lang]);
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred-language", lang);
    }
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, currentLanguageLookup }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
