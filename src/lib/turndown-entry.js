import TurndownService from 'turndown';
import * as turndownPluginGfm from 'turndown-plugin-gfm';

if (typeof window !== 'undefined') {
  window.TurndownService = TurndownService;
  window.turndownPluginGfm = turndownPluginGfm;
}
