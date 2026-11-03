import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthFlow from "./AuthFlow";

// Google's real script isn't loaded in jsdom — stub just enough of its shape
// so the component's useEffect finds window.google and registers a callback
// we can trigger ourselves, as if a real user had completed Google sign-in.
let capturedGoogleCallback;

function mockFetchOnce(body, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) });
}

beforeEach(() => {
  capturedGoogleCallback = undefined;
  window.google = {
    accounts: {
      id: {
        initialize: ({ callback }) => {
          capturedGoogleCallback = callback;
        },
        renderButton: () => {},
      },
    },
  };
});

afterEach(() => {
  delete window.google;
  vi.unstubAllGlobals();
});

describe("AuthFlow", () => {
  it("shows the login step first", () => {
    render(<AuthFlow onComplete={() => {}} />);
    expect(screen.getByText("Sign in to EduEats")).toBeInTheDocument();
  });

  it("shows a blocking message instead of navigating when Apple is clicked", async () => {
    render(<AuthFlow onComplete={() => {}} />);
    await userEvent.click(screen.getByText("Continue with Apple"));
    expect(screen.getByText("Sign in to EduEats")).toBeInTheDocument();
    expect(await screen.findByText(/apple sign-in isn't available/i)).toBeInTheDocument();
  });

  it("signing up with email reaches the profile step, then creates a real account", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOnce({ id: 11, name: "Test Student", grade: "Grade 9", room_no: "301" })
    );
    const onComplete = vi.fn();
    render(<AuthFlow onComplete={onComplete} />);

    await userEvent.click(screen.getByText("Sign Up"));
    await userEvent.type(screen.getByLabelText(/full name/i), "Test Student");
    await userEvent.type(screen.getByLabelText(/email/i), "test@school.test");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByText("Create Account"));

    expect(await screen.findByText("Set up your profile")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/grade \/ class/i), "Grade 9");
    await userEvent.type(screen.getByLabelText(/room no/i), "301");
    await userEvent.click(screen.getByText("Save & Continue"));

    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        id: 11,
        name: "Test Student",
        classLine: "Grade 9 · Rm 301",
        photoDataUrl: null,
      })
    );
  });

  it("uploads a selected photo to the real student record after signing up", async () => {
    const fetchMock = vi.fn((url) => {
      if (url.endsWith("/api/signup")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 11, name: "Test Student", grade: "Grade 9", room_no: "301" }),
        });
      }
      if (url.endsWith("/api/students/11/photo")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ photo_path: "/photos/11-123.png" }) });
      }
      throw new Error(`unexpected fetch to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const onComplete = vi.fn();
    render(<AuthFlow onComplete={onComplete} />);

    await userEvent.click(screen.getByText("Sign Up"));
    await userEvent.type(screen.getByLabelText(/full name/i), "Test Student");
    await userEvent.type(screen.getByLabelText(/email/i), "test@school.test");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByText("Create Account"));
    await screen.findByText("Set up your profile");

    const photoFile = new File(["fake-image-bytes"], "me.png", { type: "image/png" });
    const fileInput = document.querySelector(".photo-input");
    await userEvent.upload(fileInput, photoFile);

    await userEvent.type(screen.getByLabelText(/grade \/ class/i), "Grade 9");
    await userEvent.type(screen.getByLabelText(/room no/i), "301");
    await userEvent.click(screen.getByText("Save & Continue"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3000/api/students/11/photo",
        expect.objectContaining({ method: "POST" })
      )
    );
    expect(onComplete).toHaveBeenCalledWith({
      id: 11,
      name: "Test Student",
      classLine: "Grade 9 · Rm 301",
      photoDataUrl: "http://localhost:3000/photos/11-123.png",
    });
  });

  it("goes back to login when Back is clicked from the Sign Up profile step", async () => {
    render(<AuthFlow onComplete={() => {}} />);
    await userEvent.click(screen.getByText("Sign Up"));
    await userEvent.type(screen.getByLabelText(/full name/i), "Test Student");
    await userEvent.type(screen.getByLabelText(/email/i), "test@school.test");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByText("Create Account"));
    await userEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Sign in to EduEats")).toBeInTheDocument();
  });

  it("registers a real Google callback once the script is available", async () => {
    render(<AuthFlow onComplete={() => {}} />);
    await waitFor(() => expect(capturedGoogleCallback).toBeTypeOf("function"));
  });

  it("a brand-new Google sign-in goes to the profile step with a real database id", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOnce({ id: 5, name: "Jane Doe", email: "jane@school.test", grade: null, room_no: null })
    );
    render(<AuthFlow onComplete={() => {}} />);
    await waitFor(() => expect(capturedGoogleCallback).toBeTypeOf("function"));

    await capturedGoogleCallback({ credential: "fake-jwt" });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/google",
      expect.objectContaining({ method: "POST" })
    );
    expect(await screen.findByText("Set up your profile")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
  });

  it("a returning Google student with a complete profile skips straight to the dashboard", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOnce({ id: 5, name: "Jane Doe", email: "jane@school.test", grade: "Grade 9", room_no: "301" })
    );
    const onComplete = vi.fn();
    render(<AuthFlow onComplete={onComplete} />);
    await waitFor(() => expect(capturedGoogleCallback).toBeTypeOf("function"));

    await capturedGoogleCallback({ credential: "fake-jwt" });

    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        id: 5,
        name: "Jane Doe",
        classLine: "Grade 9 · Rm 301",
        photoDataUrl: null,
      })
    );
  });

  it("saving a new Google student's profile PATCHes the real student id and completes with it", async () => {
    const fetchMock = vi.fn((url) => {
      if (url.endsWith("/api/auth/google")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 5, name: "Jane Doe", email: "jane@school.test", grade: null, room_no: null }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 5, grade: "Grade 9", room_no: "301" }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    const onComplete = vi.fn();
    render(<AuthFlow onComplete={onComplete} />);
    await waitFor(() => expect(capturedGoogleCallback).toBeTypeOf("function"));
    await capturedGoogleCallback({ credential: "fake-jwt" });
    await screen.findByText("Set up your profile");

    await userEvent.type(screen.getByLabelText(/grade \/ class/i), "Grade 9");
    await userEvent.type(screen.getByLabelText(/room no/i), "301");
    await userEvent.click(screen.getByText("Save & Continue"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3000/api/students/5",
        expect.objectContaining({ method: "PATCH" })
      )
    );
    expect(onComplete).toHaveBeenCalledWith({
      id: 5,
      name: "Jane Doe",
      classLine: "Grade 9 · Rm 301",
      photoDataUrl: null,
    });
  });
});
