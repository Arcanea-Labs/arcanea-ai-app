#!/usr/bin/env node
/**
 * Arcanea worldbuilding MCP server
 * A worldbuilding toolkit for the Arcanea universe.
 * Making magic through AI-human co-creation.
 *
 * Features:
 * - Worldbuilding generators (characters, magic, locations, creatures, artifacts)
 * - Luminor AI companions with Council mode
 * - Bestiary of creative blocks with deep diagnosis
 * - In-process creative journeys and explicitly saved world graphs
 * - Canon validation and Ten Gates system
 * - Agent orchestration system (inspired by oh-my-opencode)
 * - Creation graph with relationship network
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export interface ServerOptions {
    /** Comma list of toolsets or "all". Omitted: every tool, for library callers. */
    toolsets?: string;
}
export declare function createServer(options?: ServerOptions): McpServer;
/** Backwards-compatible library instance. New transports should use createServer(). */
export declare const server: McpServer;
//# sourceMappingURL=index.d.ts.map