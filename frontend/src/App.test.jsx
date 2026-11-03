import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

// Apple sign-in is intentionally blocked (no real backend for it), and
// Google sign-in needs its real script — so reaching the dashboard in these
// App-level tests goes through the real (mocked) email Sign Up form, the
// one path that doesn't depend on a third-party widget.
async function signUpAndReachProfile() {
  await userEvent.click(screen.getByText("Sign Up"));
  await userEvent.type(screen.getByLabelText(/full name/i), "Test Student");
  await userEvent.type(screen.getByLabelText(/email/i), "test@school.test");
  await userEvent.type(screen.getByLabelText(/password/i), "secret123");
  await userEvent.click(screen.getByText("Create Account"));
  await screen.findByText("Set up your profile");
  // Grade/room are required before Save & Continue will proceed.
  await userEvent.type(screen.getByLabelText(/grade \/ class/i), "Grade 8");
  await userEvent.type(screen.getByLabelText(/room no/i), "214");
}

beforeEach(() => {
  localStorage.clear(); // each test starts signed out, never reusing a previous test's saved session
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "Test Student", grade: "Grade 8", room_no: "214" }),
    })
  );
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("starts on the login screen", () => {
    render(<App />);
    expect(screen.getByText("Sign in to EduEats")).toBeInTheDocument();
  });

  it("blocks Apple sign-in with a message instead of navigating anywhere", async () => {
    render(<App />);
    await userEvent.click(screen.getByText("Continue with Apple"));
    expect(screen.getByText("Sign in to EduEats")).toBeInTheDocument();
    expect(await screen.findByText(/apple sign-in isn't available/i)).toBeInTheDocument();
  });

  it("moves to the dashboard after completing sign up + profile", async () => {
    render(<App />);
    await signUpAndReachProfile();
    await userEvent.click(screen.getByText("Save & Continue"));
    expect(await screen.findByText("Class Session")).toBeInTheDocument();
  });

  it("toggles data-theme on the document root", async () => {
    render(<App />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    await userEvent.click(screen.getByRole("button", { name: /switch between light and dark mode/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("returns to the login screen after logging out from the dashboard", async () => {
    render(<App />);
    await signUpAndReachProfile();
    await userEvent.click(screen.getByText("Save & Continue"));
    await screen.findByText("Class Session");
    await userEvent.click(screen.getByText("Settings")); // Log Out now lives on the Settings page
    await userEvent.click(screen.getByText("Log Out"));
    expect(screen.getByText("Sign in to EduEats")).toBeInTheDocument();
  });

  it("saves the signed-in student so the dashboard reopens directly next time", async () => {
    const { unmount } = render(<App />);
    await signUpAndReachProfile();
    await userEvent.click(screen.getByText("Save & Continue"));
    await screen.findByText("Class Session");
    unmount();

    // Simulates reopening the app in the same browser (new mount, same
    // localStorage) — it should skip sign-in entirely.
    render(<App />);
    expect(screen.getByText("Class Session")).toBeInTheDocument();
    expect(screen.queryByText("Sign in to EduEats")).not.toBeInTheDocument();
  });

  it("clears the saved session on logout so reopening asks to sign in again", async () => {
    const { unmount } = render(<App />);
    await signUpAndReachProfile();
    await userEvent.click(screen.getByText("Save & Continue"));
    await screen.findByText("Class Session");
    await userEvent.click(screen.getByText("Settings")); // Log Out now lives on the Settings page
    await userEvent.click(screen.getByText("Log Out"));
    unmount();

    render(<App />);
    expect(screen.getByText("Sign in to EduEats")).toBeInTheDocument();
  });
});
