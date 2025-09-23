export const TYPE_MAPPINGS: Record<string, string> = {
  cmn_icn_ene_01_gra: "green",
  cmn_icn_ene_02_fir: "fire",
  cmn_icn_ene_03_wat: "water",
  cmn_icn_ene_04_lig: "lighting",
  cmn_icn_ene_05_psy: "psychic",
  cmn_icn_ene_06_fig: "fighting",
  cmn_icn_ene_07_dar: "dark",
  cmn_icn_ene_08_met: "metal",
  cmn_icn_ene_09_dra: "dragon",
  cmn_icn_ene_10_nor: "colorless",
  potion: "item",
  trainer: "trainer",
};

export const RARITY_MAPPINGS: Record<string, string[]> = {
  "pack_icn_rarity_detail_01-1": ["common"],
  "pack_icn_rarity_detail_01-2": ["uncommon"],
  "pack_icn_rarity_detail_01-3": ["rare"],
  "pack_icn_rarity_detail_01-4": ["double rare"],
  "pack_icn_rarity_detail_02-1": ["art rare"],
  "pack_icn_rarity_detail_02-2": ["super rare", "super art rare"],
  "pack_icn_rarity_detail_02-3": ["immersive rare"],
  "pack_icn_rarity_detail_03-1": ["shiny"],
  "pack_icn_rarity_detail_03-2": ["shiny super rare"],
  "pack_icn_rarity_detail_04-1": ["ultra rare"],
};

const PACKAGE_CODES = [
  ["A1", "genetic-apex"],
  ["A1a", "mythical-island"],
  ["A2", "space-time-smackdown"],
  ["A2a", "triumphant-light"],
  ["A2b", "shining-rivalry"],
  ["A3", "celestial-guardians"],
  ["A3a", "extradimensional-crisis"],
  ["A3b", "eevee-groove"],
];

const LANGUAGES = ["zh_TW", "ja_JP", "en_US"];

export const PACKAGE_MAPPINGS: Record<
  string,
  Record<string, string>
> = LANGUAGES.reduce((acc, lang) => {
  acc[lang] = PACKAGE_CODES.reduce((pkgAcc, [code, name]) => {
    pkgAcc[`LOGO_expansion_${code}_${lang}`] = `${code}_${name}`;
    return pkgAcc;
  }, {} as Record<string, string>);
  return acc;
}, {} as Record<string, Record<string, string>>);

const BOOSTER_CODES = [
  ["A1_100020_LIZARDON", "charizard"],
  ["A1_100030_PIKACHU", "pikachu"],
  ["A1_100010_MEWTWO", "mewtwo"],
  ["A1_100040_theme", "mew"],
  ["A2_100050_DIALGA", "dialga"],
  ["A2_100060_PALKIA", "palkia"],
  ["A2a_100070_TRIUMPHAN", "arceus"],
  ["A2b_100080_SHINING", "shining"],
  ["A3_100090_SOLGALEO", "solgaleo"],
  ["A3_100100_LUNALA", "lunala"],
  ["A3a_100110_CRISIS", "nihilego"],
  ["A3b_100120_EIEVUI", "eevee"],
];

export const BOOSTER_MAPPINGS: Record<
  string,
  Record<string, string>
> = LANGUAGES.reduce((acc, lang) => {
  acc[lang] = BOOSTER_CODES.reduce((pkgAcc, [code, name]) => {
    pkgAcc[`EXPANSION_PACK_${code}_${lang}`] = `${name}`;
    return pkgAcc;
  }, {} as Record<string, string>);
  return acc;
}, {} as Record<string, Record<string, string>>);
