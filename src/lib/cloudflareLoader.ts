export default function cloudflareLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  const params = [`width=${width}`, `quality=${quality || 80}`, "format=webp"];

  const domain = "https://www.pokemon-tcg-pocket-data.com/";
  let path = src;

  if (path.startsWith(domain)) {
    path = path.slice(domain.length);
  }

  // Ensure we don't have double slashes if path starts with /
  if (path.startsWith("/")) {
    path = path.slice(1);
  }

  return `${domain}/cdn-cgi/image/${params.join(",")}/${path}`;
}
