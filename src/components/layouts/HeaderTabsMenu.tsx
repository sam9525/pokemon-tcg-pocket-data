import ProfileMenu from "./ProfileMenu";
import HeaderTabs from "./HeaderTabs";
import Close from "../icons/close";

export default function HeaderTabsMenu({
  image,
  userName,
  setShowHeaderTabsMenu,
}: {
  image: string;
  userName: string;
  setShowHeaderTabsMenu: (show: boolean) => void;
}) {
  return (
    <div className="z-100 w-full h-full bg-foreground px-6 py-6 flex flex-col items-center justify-center gap-5 text-xl text-bold fixed top-0 left-0">
      <button
        className="absolute top-8 right-8 w-7 sm:w-9"
        onClick={() => setShowHeaderTabsMenu(false)}
      >
        <Close />
      </button>
      <HeaderTabs variant="mobile" />
      <ProfileMenu image={image} userName={userName} variant="mobile" />
    </div>
  );
}
