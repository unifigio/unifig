import type { Plugin } from '../types';

export class PluginLoader {
  async loadPlugins(pluginNames: string[]): Promise<Plugin[]> {
    const plugins: Plugin[] = [];

    // Load core plugins by default
    plugins.push(...await this.loadCorePlugins());

    // Load specified plugins
    for (const name of pluginNames) {
      try {
        const plugin = await this.loadPlugin(name);
        if (plugin) {
          plugins.push(plugin);
        }
      } catch (error) {
        console.warn(`Failed to load plugin ${name}: ${error}`);
      }
    }

    return plugins;
  }

  private async loadCorePlugins(): Promise<Plugin[]> {
    const plugins: Plugin[] = [];

    // Import core plugins
    const { templateVariablesPlugin } = await import('./core/template-variables');
    plugins.push(templateVariablesPlugin);

    const { importPathsPlugin } = await import('./core/import-paths');
    plugins.push(importPathsPlugin);

    const { envInjectorPlugin } = await import('./core/env-injector');
    plugins.push(envInjectorPlugin);

    return plugins;
  }

  private async loadPlugin(name: string): Promise<Plugin | null> {
    // Try to load from different locations
    const locations = [
      `./${name}`, // Local file
      `~/.unifig/plugins/${name}`, // User plugins
      `@unifig/plugin-${name}`, // NPM plugins
      `unifig-plugin-${name}`, // Alternative NPM naming
    ];

    for (const location of locations) {
      try {
        const plugin = await import(location);
        return plugin.default || plugin;
      } catch {
        // Try next location
      }
    }

    throw new Error(`Plugin ${name} not found`);
  }
}