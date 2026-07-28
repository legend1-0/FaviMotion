import { describe, it, expect, afterEach } from "vitest";
import { FaviconManager } from "../src/exports/FaviconManager.js";

describe("FaviconManager", () => {
  afterEach(() => {
    document.querySelectorAll("link[rel~='icon']").forEach((link) => link.remove());
  });

  it("creates a favicon link tag when none exists", () => {
    const manager = new FaviconManager();
    expect(document.querySelectorAll("link[rel~='icon']").length).toBe(1);
    manager.destroy();
  });

  it("reuses an existing favicon link instead of creating a new one", () => {
    const existing = document.createElement("link");
    existing.rel = "icon";
    existing.href = "https://example.com/favicon.ico";
    document.head.appendChild(existing);

    const manager = new FaviconManager();
    expect(document.querySelectorAll("link[rel~='icon']").length).toBe(1);
    manager.destroy();
  });

  it("update() sets href and type on every managed link", () => {
    const manager = new FaviconManager();
    manager.update("data:image/png;base64,xyz");
    const link = document.querySelector("link[rel~='icon']");
    expect(link.href).toContain("data:image/png");
    manager.destroy();
  });

  it("restore() removes a tag it created itself", () => {
    const manager = new FaviconManager();
    manager.update("data:image/png;base64,xyz");
    manager.restore();
    expect(document.querySelectorAll("link[rel~='icon']").length).toBe(0);
  });

  it("restore() reverts href/type on a pre-existing tag rather than removing it", () => {
    const existing = document.createElement("link");
    existing.rel = "icon";
    existing.type = "image/x-icon";
    existing.href = "https://example.com/original.ico";
    document.head.appendChild(existing);

    const manager = new FaviconManager();
    manager.update("data:image/png;base64,xyz");
    manager.restore();

    const link = document.querySelector("link[rel~='icon']");
    expect(link).not.toBeNull();
    expect(link.href).toBe("https://example.com/original.ico");
  });
});
