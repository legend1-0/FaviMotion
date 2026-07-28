/**
 * @module plugins/PluginManager
 * A plugin is a plain object:
 *   {
 *     name: string,
 *     install(favicon, api) { ... },   // called once, on favicon.use(plugin)
 *     destroy(favicon) { ... }         // optional, called on favicon.destroy()
 *   }
 *
 * `api` exposes registration hooks so plugins can extend the library without
 * the core needing to know about them:
 *   api.registerSource(name, factory)
 *   api.registerEffect(name, fn)
 *   api.registerExporter(name, fn)
 *   api.on(event, handler)
 */

export class PluginManager {
  /**
   * @param {import("../core/Favicon.js").Favicon} favicon
   */
  constructor(favicon) {
    this._favicon = favicon;
    /** @type {Map<string, object>} */
    this._plugins = new Map();
    /** @type {Map<string, Function>} */
    this._customSources = new Map();
    /** @type {Map<string, Function>} */
    this._customExporters = new Map();
  }

  /**
   * @param {object} plugin
   */
  use(plugin) {
    if (!plugin || typeof plugin.install !== "function") {
      throw new TypeError("favicon-motion: plugin must implement install(favicon, api)");
    }
    if (this._plugins.has(plugin.name)) return this._favicon; // idempotent

    const api = {
      registerSource: (name, factory) => this._customSources.set(name, factory),
      registerEffect: (name, fn) => this._favicon._effects.add === undefined
        ? undefined
        : this._favicon._registerEffectDefinition(name, fn),
      registerExporter: (name, fn) => this._customExporters.set(name, fn),
      on: (event, handler) => this._favicon.on(event, handler),
    };

    plugin.install(this._favicon, api);
    this._plugins.set(plugin.name ?? `plugin_${this._plugins.size}`, plugin);
    return this._favicon;
  }

  /**
   * @param {string} name
   * @returns {Function|undefined}
   */
  getCustomSource(name) {
    return this._customSources.get(name);
  }

  /**
   * @param {string} name
   * @returns {Function|undefined}
   */
  getCustomExporter(name) {
    return this._customExporters.get(name);
  }

  /** Call destroy() on every installed plugin that defines one. */
  destroyAll() {
    for (const plugin of this._plugins.values()) {
      if (typeof plugin.destroy === "function") {
        try {
          plugin.destroy(this._favicon);
        } catch {
          // A misbehaving plugin should never prevent the rest of teardown.
        }
      }
    }
    this._plugins.clear();
    this._customSources.clear();
    this._customExporters.clear();
  }
}
