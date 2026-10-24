import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare function runStdio(server: McpServer): Promise<void>;
export type RunningHttpServer = {
    url: string;
    close(): Promise<void>;
};
/** Local single-user transport. Session ids route clients; they are not authentication. */
export declare function runHttp(createServer: () => McpServer, port: number): Promise<RunningHttpServer>;
//# sourceMappingURL=transport.d.ts.map