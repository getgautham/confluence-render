#!/usr/bin/env node
// A tiny MCP server over stdio (JSON-RPC 2.0, one message per line).
// Two tools: list_spaces and publish_file. Nothing else, and it never deletes.
import { createInterface } from 'node:readline';
import { readConfig, client, listSpaces, publish, UserError } from './confluence.mjs';

const VERSION = '0.1.0';

const TOOLS = [
  {
    name: 'list_spaces',
    description: 'List Confluence spaces the person can see, to find a space_key for publish_file.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Part of a space name or key.' } },
    },
  },
  {
    name: 'publish_file',
    description:
      'Put a local .md or .html file on a Confluence page, shown in full by the "Markdown & HTML file" macro. ' +
      'Give space_key to make a new page, or page_id to add the file to an existing page (publishing the same file name again replaces it with the new version).',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the .md, .markdown, .html or .htm file (2 MB max).' },
        space_key: { type: 'string', description: 'Space for a new page.' },
        title: { type: 'string', description: 'Title for a new page. Defaults to the file name.' },
        parent_page_id: { type: 'string', description: 'Put the new page under this page.' },
        page_id: { type: 'string', description: 'Existing page to add or update the file on.' },
        run_scripts: {
          type: 'boolean',
          description: 'HTML only. Let the file run its JavaScript, in a sandbox with no access to Confluence. Only when the page needs it (charts, tabs).',
        },
      },
      required: ['path'],
    },
  },
];

const cfg = readConfig(process.env);
const api = cfg.missing.length ? null : client(cfg);

async function callTool(name, args = {}) {
  if (!api) throw new UserError(`The Confluence plugin isn't set up. Missing: ${cfg.missing.join(', ')}. Run /plugin, pick confluence-render, and fill in its settings.`);
  if (name === 'list_spaces') return listSpaces(api, args.query);
  if (name === 'publish_file') return publish(api, cfg, args);
  throw new UserError(`Unknown tool ${name}.`);
}

async function handle(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: params?.protocolVersion ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'confluence-render', version: VERSION },
      };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: TOOLS };
    case 'tools/call':
      try {
        const result = await callTool(params?.name, params?.arguments);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        // Only our own messages go back to the model. Anything unexpected stays generic.
        const text = e instanceof UserError ? e.message : 'Something went wrong talking to Confluence. Try again.';
        if (!(e instanceof UserError)) console.error(`[confluence-render] ${e?.name}: ${e?.message}`);
        return { content: [{ type: 'text', text }], isError: true };
      }
    default:
      if (id === undefined) return undefined; // a notification: no reply
      throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 });
  }
}

const send = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

createInterface({ input: process.stdin }).on('line', async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
  }
  try {
    const result = await handle(msg);
    if (msg.id !== undefined && result !== undefined) send({ jsonrpc: '2.0', id: msg.id, result });
  } catch (e) {
    if (msg.id !== undefined) send({ jsonrpc: '2.0', id: msg.id, error: { code: e.code ?? -32603, message: e.message } });
  }
});
