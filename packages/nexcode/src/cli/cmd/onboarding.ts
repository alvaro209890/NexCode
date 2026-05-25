import { Effect, Option } from "effect"
import { Auth } from "../../auth"
import { Config } from "@/config/config"
import * as Prompt from "../effect/prompt"
import { UI } from "../ui"
import { Global } from "@opencode-ai/core/global"
import { Filesystem } from "@/util/filesystem"
import path from "path"
import { EOL } from "os"

const promptValue = <Value>(value: Option.Option<Value>) => {
  if (Option.isNone(value)) return Effect.die(new UI.CancelledError())
  return Effect.succeed(value.value)
}

export const runOnboarding = Effect.fn("Cli.onboarding.run")(function* () {
  const authSvc = yield* Auth.Service
  const cfgSvc = yield* Config.Service
  const fs = yield* Filesystem.Service

  const marker = path.join(Global.Path.data, ".nexcode_onboarded")
  if (yield* fs.exists(marker)) {
    return
  }

  UI.empty()
  process.stderr.write(UI.logo() + EOL + EOL)
  yield* Prompt.intro(UI.Style.TEXT_HIGHLIGHT_BOLD + "Welcome to NexCode")
  yield* Prompt.log.info("Let's set up your environment. NexCode is optimized for DeepSeek.")

  const apiKey = yield* promptValue(
    yield* Prompt.password({
      message: "Enter your DeepSeek API Key (from https://platform.deepseek.com/)",
      validate: (x) => (x && x.length > 0 ? undefined : "Required"),
    }),
  )

  // Save the API key
  yield* authSvc.set("deepseek", { type: "api", key: apiKey })

  // Update global config with DeepSeek as default
  const config: Config.Info = {
    model: "deepseek/deepseek-chat", // DeepSeek v4 Pro/Flash are often mapped via deepseek-chat or specific IDs
    small_model: "deepseek/deepseek-chat",
    provider: {
      deepseek: {
        name: "DeepSeek",
      },
    },
  }

  yield* cfgSvc.updateGlobal(config)

  // Create marker file
  yield* fs.writeFileString(marker, "done")

  yield* Prompt.log.success("Setup complete! NexCode is now using DeepSeek v4.")
  yield* Prompt.outro("Ready to code.")
  UI.empty()
})
