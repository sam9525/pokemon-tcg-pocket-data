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

export const LANGUAGE = "zh_TW";

export const PACKAGE_MAPPINGS: Record<string, string> = {
  [`LOGO_expansion_A1_${LANGUAGE}`]: "A1_genetic-apex",
  [`LOGO_expansion_A1a_${LANGUAGE}`]: "A1a_mythical-island",
  [`LOGO_expansion_A2_${LANGUAGE}`]: "A2_space-time-smackdown",
  [`LOGO_expansion_A2a_${LANGUAGE}`]: "A2a_triumphant-light",
  [`LOGO_expansion_A2b_${LANGUAGE}`]: "A2b_shining-rivalry",
  [`LOGO_expansion_A3_${LANGUAGE}`]: "A3_celestial-guardians",
  [`LOGO_expansion_A3a_${LANGUAGE}`]: "A3a_extradimensional-crisis",
  [`LOGO_expansion_A3b_${LANGUAGE}`]: "A3b_eevee-groove",
};

export const BOOSTER_MAPPINGS: Record<string, string> = {
  [`EXPANSION_PACK_A1_100020_LIZARDON_${LANGUAGE}`]: "charizard",
  [`EXPANSION_PACK_A1_100030_PIKACHU_${LANGUAGE}`]: "pikachu",
  [`EXPANSION_PACK_A1_100010_MEWTWO_${LANGUAGE}`]: "mewtwo",
  [`EXPANSION_PACK_A1_100040_theme_${LANGUAGE}`]: "mew",
  [`EXPANSION_PACK_A2_100050_DIALGA_${LANGUAGE}`]: "dialga",
  [`EXPANSION_PACK_A2_100060_PALKIA_${LANGUAGE}`]: "palkia",
  [`EXPANSION_PACK_A2a_100070_TRIUMPHAN_${LANGUAGE}`]: "arceus",
  [`EXPANSION_PACK_A2b_100080_SHINING${LANGUAGE}`]: "shining",
  [`EXPANSION_PACK_A3_100090_SOLGALEO_${LANGUAGE}`]: "solgaleo",
  [`EXPANSION_PACK_A3_100100_LUNALA_${LANGUAGE}`]: "lunala",
  [`EXPANSION_PACK_A3a_100110_CRISIS_${LANGUAGE}`]: "nihilego",
  [`EXPANSION_PACK_A3b_100120_EIEVUI_${LANGUAGE}`]: "eevee",
};
