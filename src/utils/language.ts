let language: string = "zh_TW";

export const setLanguage = (lang: string) => {
  language = lang;
  console.log("language set to", language);
};

export const getLanguage = () => {
  console.log("language get to", language);
  return language;
};
