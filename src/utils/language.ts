let language: string = "zh_TW";

export const setLanguage = (lang: string) => {
  language = lang;
};

export const getLanguage = () => {
  return language;
};

// Language
import English from "../language/en.json";
import Japanese from "../language/ja.json";
import TraditionalChinese from "../language/zh-TW.json";

export const languageLookup: Record<
  string,
  Record<string, Record<string, string>>
> = {
  en_US: English,
  ja_JP: Japanese,
  zh_TW: TraditionalChinese,
};
