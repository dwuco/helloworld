import { describe, expect, it } from "vitest";
import {
  EMAIL_PROVIDERS,
  EmailConsentRequiredError,
  IntegrationUnavailableError,
  RETAILERS,
  detectRetailer,
  getEmailConnector,
} from "@/lib/integrations";
import { DEFAULT_SETTINGS } from "@/lib/types";

describe("integration honesty", () => {
  it("email import is off by default", () => {
    expect(DEFAULT_SETTINGS.emailConsent).toEqual({ optedIn: false, optedInAt: null });
  });

  it("no mailbox connector can be reached without opt-in", () => {
    for (const p of EMAIL_PROVIDERS) {
      expect(() => getEmailConnector(p.id, { optedIn: false, optedInAt: null })).toThrow(EmailConsentRequiredError);
    }
  });

  it("does not claim Gmail or Outlook work in this build, even after opt-in", () => {
    for (const p of EMAIL_PROVIDERS) {
      expect(p.status).not.toBe("available");
      expect(() => getEmailConnector(p.id, { optedIn: true, optedInAt: "2026-10-30T00:00:00Z" })).toThrow(IntegrationUnavailableError);
    }
  });

  it("marks every retailer as manual import, never automatic sync", () => {
    const ids = RETAILERS.map((r) => r.id);
    for (const id of ["walmart", "sams-club", "costco"]) expect(ids).toContain(id);
    for (const r of RETAILERS) expect(r.status).toBe("manual_import");
  });

  it("detects retailers from pasted text", () => {
    expect(detectRetailer("Kirkland Signature Eggs")).toBe("costco");
    expect(detectRetailer("Thanks for shopping at Sam's Club")).toBe("sams-club");
    expect(detectRetailer("Great Value Milk")).toBe("walmart");
    expect(detectRetailer("random")).toBeNull();
  });
});
