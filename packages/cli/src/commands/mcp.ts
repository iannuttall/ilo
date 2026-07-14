import { defineCommand } from 'citty'

export const mcpCommand = defineCommand({
  meta: { name: 'mcp', description: 'Run the local stdio MCP server' },
  subCommands: {
    serve: defineCommand({
      meta: { name: 'serve', description: 'Start the local stdio MCP server' },
      run: async () => {
        const { startMcpServer } = await import('@ilo/mcp')
        await startMcpServer()
      },
    }),
  },
})
