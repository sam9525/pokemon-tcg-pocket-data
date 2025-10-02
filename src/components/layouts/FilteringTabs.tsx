export default function FilteringTabs({
  filter,
  setFilter,
  currentLanguageLookup,
}: {
  filter: string[];
  setFilter: (filter: string[]) => void;
  currentLanguageLookup: Record<string, Record<string, string>>;
}) {
  return (
    <div className="flex flex-row flex-wrap gap-4 sm:gap-5 md:gap-6 mb-5 sm:mb-7 md:mb-10 items-center justify-center">
      <div
        className={`filtering-button ${filter.length === 0 ? "active" : ""}`}
        onClick={() => setFilter([])}
      >
        {currentLanguageLookup.FILTER.all}
      </div>
      <div
        className={`filtering-button ${
          filter.includes("pokemon") ? "active" : ""
        }`}
        onClick={() => setFilter(["pokemon"])}
      >
        {currentLanguageLookup.FILTER.pokemon}
      </div>
      <div
        className={`filtering-button ${
          filter.includes("pokemon-ex") ? "active" : ""
        }`}
        onClick={() => setFilter(["pokemon-ex"])}
      >
        {currentLanguageLookup.FILTER.pokemonex}
      </div>
      <div
        className={`filtering-button ${
          filter.includes("special-art") ? "active" : ""
        }`}
        onClick={() => setFilter(["special-art"])}
      >
        {currentLanguageLookup.FILTER.specialArt}
      </div>
      <div
        className={`filtering-button ${
          filter.includes("real-art") ? "active" : ""
        }`}
        onClick={() => setFilter(["real-art"])}
      >
        {currentLanguageLookup.FILTER.liveCard}
      </div>
      <div
        className={`filtering-button ${
          filter.includes("crown") ? "active" : ""
        }`}
        onClick={() => setFilter(["crown"])}
      >
        {currentLanguageLookup.FILTER.crown}
      </div>
    </div>
  );
}
