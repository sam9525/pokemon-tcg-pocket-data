import PackagePageClient from "../PackagePageClient";

export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string; cardId: string }>;
}) {
  const { id, cardId } = await params;

  const response = await fetch(
    `${process.env.AUTH_URL}/api/cards/${id}?language=en`
  );
  const data = await response.json();

  return (
    <PackagePageClient
      packageId={id}
      initialCards={data.cards}
      focusedCardId={cardId}
    />
  );
}
