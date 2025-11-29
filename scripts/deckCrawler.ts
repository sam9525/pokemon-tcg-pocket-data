import puppeteer from "puppeteer-extra";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import connectDB from "@/lib/mongodb";
import { DeckList } from "@/models/DeckList";
import crypto from "crypto";

process.removeAllListeners("warning");

// Add the adblocker plugin
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

interface Card {
  cardName: string;
  cardCount: number;
  boosterPack?: string;
}

interface CardList {
  [playerName: string]: Card[];
}

interface IDeckList {
  package: string;
  deckName: string;
  count: number;
  highlight: Card[];
  cardList: CardList;
  deckListHash: string;
}

function normalizeHighlight(highlight: Card[]) {
  return highlight
    .map((h) => ({
      cardName: (h.cardName || "").trim(),
      cardCount: h.cardCount || 0,
      boosterPack: (h.boosterPack || "").trim(),
    }))
    .sort((a, b) => a.cardName.localeCompare(b.cardName));
}

function normalizeCardList(cardList: CardList) {
  const allCards: Card[] = [];

  for (const player in cardList) {
    cardList[player].forEach((card: Card) => {
      allCards.push({
        cardName: (card.cardName || "").trim(),
        cardCount: card.cardCount || 0,
        boosterPack: (card.boosterPack || "").trim(),
      });
    });
  }

  return allCards.sort((a, b) => {
    if (a.cardName !== b.cardName) return a.cardName.localeCompare(b.cardName);
    if (a.cardCount !== b.cardCount) return a.cardCount - b.cardCount;
    return (a.boosterPack || "").localeCompare(b.boosterPack || "");
  });
}

function generateDeckListHash(deck: {
  count: number;
  highlight: Card[];
  cardList: CardList;
}) {
  // Create a normalized object with all fields
  const normalizedDeck = {
    count: deck.count,
    highlight: normalizeHighlight(deck.highlight),
    cardList: normalizeCardList(deck.cardList),
  };

  // Generate hash from the entire object
  const str = JSON.stringify(normalizedDeck);
  return crypto.createHash("md5").update(str).digest("hex");
}

async function crawlWebsite() {
  const webUrl = "https://play.limitlesstcg.com/decks?game=POCKET";

  // Start the browser and crawl the website
  const browser = await puppeteer.launch({
    headless: true, // Show the browser!
    devtools: false,
    args: ["--start-maximized", "--no-sandbox", "--disable-setuid-sandbox"],
  });

  // Open a new page and navigate to the website
  const page = await browser.newPage();
  await page.goto(webUrl, {
    waitUntil: "domcontentloaded",
  });

  // Get the length of the select option
  const selectOptionLength = await page.$eval(
    "select#set",
    (el) => el.options.length
  );

  // Connect to db
  await connectDB();

  for (let setIndex = 0; setIndex < selectOptionLength; setIndex++) {
    // Ensure we are on the main list page
    if (page.url().split("?")[0] !== webUrl.split("?")[0] || setIndex > 0) {
      await page.goto(webUrl, { waitUntil: "domcontentloaded" });
    }

    // Select the set if needed
    const targetSetInfo = await page.$eval(
      "select#set",
      (el, index, attr) => {
        const option = el.options[index];
        return {
          value: option.value,
          code: option.getAttribute(attr),
        };
      },
      setIndex,
      "data-set"
    );

    const currentSetValue = await page.$eval("select#set", (el) => el.value);

    if (targetSetInfo.value !== currentSetValue) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        page.select("select#set", targetSetInfo.value),
      ]);
    }

    // Match package name in database
    const packageName =
      targetSetInfo.code +
      "_" +
      targetSetInfo.value.split(" ")[0] +
      "-" +
      targetSetInfo.value.split(" ")[1];

    const currentSetDeckList: IDeckList[] = [];

    // Get list of deck links to process (Top 20)
    const decksToProcess = await page.$$eval("tr", (rows) => {
      return rows.slice(1, 21).map((row) => {
        const nameEl = row.querySelector("td:nth-child(3)");
        const countEl = row.querySelector("td:nth-child(4)");
        const linkEl = nameEl?.querySelector("a");
        return {
          name: nameEl?.textContent || "",
          count: countEl?.textContent || "0",
          url: linkEl?.href || null,
        };
      });
    });

    for (let i = 0; i < decksToProcess.length; i++) {
      const { name: deckName, count, url } = decksToProcess[i];
      if (!url) continue;

      const parts = deckName.split(" ");
      let highlightName = parts[0];
      if (parts.length > 1) {
        highlightName += " " + parts[1];
      }
      if (parts.length > 2 && parts[2].toLowerCase() === "ex") {
        highlightName += " " + parts[2];
      }

      // Navigate to deck page
      await page.goto(url, { waitUntil: "domcontentloaded" });

      const cardListMap: CardList = {};
      let highlight: Card[] = [];

      // Get card list links to process (Top 5)
      const cardListUrls = await page.$$eval(
        "table.striped > tbody > tr",
        (rows) => {
          return rows
            .slice(1, 6)
            .map((row) => {
              const link = row.querySelector(
                "td:nth-child(6) > a"
              ) as HTMLAnchorElement;
              return link ? link.href : null;
            })
            .filter((u) => u !== null) as string[];
        }
      );

      for (let j = 0; j < cardListUrls.length; j++) {
        await page.goto(cardListUrls[j], { waitUntil: "domcontentloaded" });

        // Get player's name
        const playerName = await page.$eval(
          "div.heading",
          (el) => el.textContent || "Unknown"
        );

        // Scrape cards
        const { pokemonList, foundHighlight } = await page.evaluate(
          (highlightName) => {
            const pokemonList: Card[] = [];
            let foundHighlight: Card[] = [];
            const columns = document.querySelectorAll("div.column > div.cards");

            columns.forEach((col, colIndex) => {
              const paragraphs = col.querySelectorAll("p");
              paragraphs.forEach((p) => {
                const text = p.textContent?.trim();
                if (!text) return;

                if (colIndex === 0) {
                  const match = text.match(
                    /^(\d+)\s+(.*?)\s+\((.*?)(?:-\d+)?\)$/
                  );
                  if (match) {
                    const cardCount = match[1];
                    const cardName = match[2];
                    const cardSet = match[3];
                    if (cardName === highlightName) {
                      foundHighlight = [
                        {
                          cardName: cardName,
                          cardCount: Number(cardCount),
                          boosterPack: cardSet,
                        },
                      ];
                    } else {
                      pokemonList.push({
                        cardName: cardName,
                        cardCount: Number(cardCount),
                        boosterPack: cardSet,
                      });
                    }
                  }
                } else {
                  const split = text.split(" ");
                  const cardCount = split[0];
                  const cardName = split.slice(1).join(" ");
                  pokemonList.push({
                    cardName: cardName,
                    cardCount: Number(cardCount),
                  });
                }
              });
            });
            return { pokemonList, foundHighlight };
          },
          highlightName
        );

        if (foundHighlight.length > 0) {
          highlight = foundHighlight;
        }
        cardListMap[playerName] = pokemonList;
      }

      currentSetDeckList.push({
        package: packageName,
        deckName: deckName,
        count: Number(count),
        highlight: highlight,
        cardList: cardListMap,
        deckListHash: generateDeckListHash({
          count: Number(count),
          highlight: highlight,
          cardList: cardListMap,
        }),
      });

      // Go to the next URL
      await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5 second delay to prevent rate limiting
    }

    // Push to the database incrementally
    if (currentSetDeckList.length > 0) {
      await DeckList.createIndexes();

      const bulkOperations = currentSetDeckList.map((deck) => ({
        updateOne: {
          filter: {
            package: deck.package,
            deckName: deck.deckName,
            deckListHash: deck.deckListHash,
          },
          update: {
            $set: {
              count: deck.count,
              highlight: deck.highlight,
              cardList: deck.cardList,
            },
          },
          upsert: true,
        },
      }));

      await DeckList.bulkWrite(bulkOperations);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds delay to prevent rate limiting
  }

  // Close the brower
  await browser.close();
}

crawlWebsite();
