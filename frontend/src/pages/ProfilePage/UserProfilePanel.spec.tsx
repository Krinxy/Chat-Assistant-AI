import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { UserProfilePanel } from "./UserProfilePanel";
import { ACTIVE_DEV_PROFILE } from "../../shared/constants/devProfiles";

describe("UserProfilePanel", () => {
  it("renders banner with active user and fact list", () => {
    render(<UserProfilePanel language="de" onOpenSettings={() => {}} />);

    expect(screen.getByRole("heading", { name: "Profil" })).toBeInTheDocument();
    expect(screen.getByText("Angemeldet als")).toBeInTheDocument();
    expect(screen.getByText(ACTIVE_DEV_PROFILE.fullName)).toBeInTheDocument();
    expect(screen.getByText(ACTIVE_DEV_PROFILE.email)).toBeInTheDocument();
    expect(screen.getByText(ACTIVE_DEV_PROFILE.id)).toBeInTheDocument();
  });

  it("invokes onOpenSettings when settings button is clicked", () => {
    const onOpenSettings = vi.fn();
    render(<UserProfilePanel language="en" onOpenSettings={onOpenSettings} />);

    const button = screen.getByRole("button", { name: /open settings/i });
    fireEvent.click(button);

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("localizes title to English", () => {
    render(<UserProfilePanel language="en" onOpenSettings={() => {}} />);

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("Signed in as")).toBeInTheDocument();
  });
});
