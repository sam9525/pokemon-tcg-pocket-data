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
    <div className="flex gap-6 mb-8">
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
