export default function FilteringTabs({
  filter,
  setFilter,
}: {
  filter: string[];
  setFilter: (filter: string[]) => void;
}) {
  return (
    <div className="flex gap-6 mb-8">
      <div
        className={`filtering-button ${filter.length === 0 ? "active" : ""}`}
        onClick={() => setFilter([])}
      >
        全部
      </div>
      <div
        className={`filtering-button ${
          filter.includes("pokemon") ? "active" : ""
        }`}
        onClick={() => setFilter(["pokemon"])}
      >
        寶可夢
      </div>
      <div
        className={`filtering-button ${
          filter.includes("pokemon-ex") ? "active" : ""
        }`}
        onClick={() => setFilter(["pokemon-ex"])}
      >
        寶可夢ex
      </div>
      <div
        className={`filtering-button ${
          filter.includes("special-art") ? "active" : ""
        }`}
        onClick={() => setFilter(["special-art"])}
      >
        Special Art
      </div>
      <div
        className={`filtering-button ${
          filter.includes("real-art") ? "active" : ""
        }`}
        onClick={() => setFilter(["real-art"])}
      >
        實境卡
      </div>
      <div
        className={`filtering-button ${
          filter.includes("crown") ? "active" : ""
        }`}
        onClick={() => setFilter(["crown"])}
      >
        皇冠
      </div>
    </div>
  );
}
