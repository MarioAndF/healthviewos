# HealthView OS Prompts

Human-authored assistant prompts live here. Edit these Markdown files instead of editing generated TypeScript or JavaScript.

Run `pnpm --filter @healthviewos/agent generate:prompts` after prompt changes, or use the normal web `dev` and `build` scripts, which regenerate prompt templates automatically.

## Files

- `healthview-agent.md` - main HealthView OS assistant instructions.
- `server-agent.md` - server-backed text assistant instructions.
- `voice-session.md` - extra realtime voice-session instructions.
- `tools/get-app-context.md` - model-visible description for the safe app-context tool.
- `tools/open-page.md` - model-visible description for UI page navigation.
- `tools/set-chat-open.md` - model-visible description for opening or closing chat.
- `tools/end-voice-chat.md` - model-visible description for ending realtime voice chat.
