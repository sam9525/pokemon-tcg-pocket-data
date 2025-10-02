import ProfileMenu from "./ProfileMenu";
import HeaderTabs from "./HeaderTabs";

export default function HeaderTabsMenu({
  image,
  userName,
}: {
  image: string;
  userName: string;
}) {
  return (
    <div className="z-100 absolute w-full h-full bg-foreground px-4 py-2 flex flex-col items-center gap-5 text-xl text-bold">
      <HeaderTabs variant="mobile" />
      <ProfileMenu image={image} userName={userName} variant="mobile" />
    </div>
  );
}
