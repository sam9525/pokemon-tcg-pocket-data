import { getCardLookupMaps } from "@/utils/cardLookup";

self.onmessage = async (event) => {
  const { cards, packageId, language } = event.data;

  // Maps (move these to constants file)
  const trainerMap = {
    cPK_10: "pokemon",
    cPK_20: "pokemon",
    cPK_90: "pokemon",
    cTR_10: "trainer",
    cTR_20: "trainer",
    cTR_90: "item",
  };

  const rarityMap = {
    C: "common",
    U: "uncommon",
    R: "rare",
    RR: "double rare",
    AR: "art rare",
    SR: "super rare",
    SAR: "super art rare",
    IM: "immersive rare",
    UR: "ultra rare",
    S: "shiny",
    SSR: "shiny super rare",
  };

  const weaknessMap = {
    grass: "fire",
    fire: "water",
    water: "lightning",
    lightning: "fighting",
    psychic: "darkness",
    fighting: "grass",
    darkness: "fighting",
    metal: "fire",
    colorless: "fighting",
  };

  // Process all cards in parallel
  const preprocessedCards = await Promise.all(
    cards.map(async (card: { id: string; url: string }) => {
      const { id: image_name, url } = card;

      // Split image name to different parts
      let parts: string[] = [];
      parts = image_name.split("_");

      const trainer = `${parts[0]}_${parts[1]}`;
      const card_id = parts[2];
      const card_name = parts[4];
      const rarity = parts[5];

      // Extract card package from packageId
      const packageCode = packageId?.split("_")[0];
      const card_package = `${packageCode}_${packageId?.split("_")[2]}`;

      let card_type = null;
      let card_booster_pack: string[] = [];

      let card_trainer = trainerMap[trainer as keyof typeof trainerMap] || "";
      const card_rarity =
        rarityMap[rarity as keyof typeof rarityMap] || "unknown";

      let special_effect = "none";

      // Get lookup maps (this will be cached after first call)
      const { regular: regularLookup, special: specialLookup } =
        await getCardLookupMaps(packageCode as string);

      // Look up card info using the cached maps
      const regularCardInfo = regularLookup.get(card_id);
      const specialCardInfo =
        specialLookup.get(card_id) || specialLookup.get(card_name);

      if (regularCardInfo) {
        card_type = regularCardInfo.type;
        card_booster_pack.push(regularCardInfo.boosterName);
      }

      let fight_energy = card_type || "colorless";

      let weakness =
        weaknessMap[card_type as keyof typeof weaknessMap] || "none";

      // Use special card data if found
      if (specialCardInfo && specialCardInfo.isSpecial) {
        card_type = specialCardInfo.type ?? card_type;
        card_trainer = specialCardInfo.trainer ?? card_trainer;
        special_effect = specialCardInfo.special_effect ?? special_effect;
        fight_energy = specialCardInfo.fight_energy ?? fight_energy;
        weakness = specialCardInfo.weakness ?? weakness;
        card_booster_pack = specialCardInfo.boosterPack ?? card_booster_pack;
      }

      // Ensure we have required values
      if (!card_type) {
        card_type = "colorless";
      }
      if (!card_trainer) {
        card_trainer = "pokemon";
      }

      return {
        cardId: image_name,
        name: card_name,
        type: card_type,
        package: card_package,
        boosterPack: card_booster_pack,
        trainer: card_trainer,
        rarity: card_rarity,
        specialEffect: special_effect,
        fightEnergy: fight_energy,
        weakness: weakness,
        language: language,
        imageUrl: url,
      };
    })
  );

  self.postMessage(preprocessedCards);
};
