/**
 * @module exports/FaviconManager
 * The only module allowed to touch <link rel="icon"> tags. Detects existing
 * favicon links, remembers their original href/type so playback can be
 * fully reverted, and updates every icon link on each committed frame.
 */

import { isBrowser } from "../utils/env.js";
import { FAVICON_MIME } from "../utils/constants.js";

const ICON_REL_SELECTOR = "link[rel~='icon']";

export class FaviconManager {
  constructor() {
    /** @type {HTMLLinkElement[]} */
    this._links = [];
    /** @type {Array<{ href: string, type: string }>} */
    this._originalState = [];
    this._createdOwnTag = false;

    if (isBrowser) {
      this._discoverOrCreateLinks();
    }
  }

  _discoverOrCreateLinks() {
    const existing = Array.from(document.querySelectorAll(ICON_REL_SELECTOR));
    if (existing.length > 0) {
      this._links = existing;
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
      this._links = [link];
      this._createdOwnTag = true;
    }
    this._originalState = this._links.map((link) => ({
      href: link.href,
      type: link.type,
    }));
  }

  /**
   * Push a new rendered frame to every managed <link> tag.
   * @param {string} dataUrl
   * @param {string} [mime]
   */
  update(dataUrl, mime = FAVICON_MIME.PNG) {
    if (!isBrowser) return;
    for (const link of this._links) {
      link.type = mime;
      link.href = dataUrl;
    }
  }

  /** Restore every managed <link> tag to its pre-animation state. */
  restore() {
    if (!isBrowser) return;
    this._links.forEach((link, i) => {
      const original = this._originalState[i];
      if (this._createdOwnTag) {
        link.remove();
      } else {
        link.type = original.type;
        link.href = original.href;
      }
    });
  }

  /** Fully tear down: restore state and drop references. */
  destroy() {
    this.restore();
    this._links = [];
    this._originalState = [];
  }
}
