import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { semanticProgressIndicatorClass, semanticProgressTrackClass, type SemanticTone } from "@/lib/semantic-status"

function Progress({
  className,
  tone = "neutral",
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { tone?: SemanticTone }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full",
        semanticProgressTrackClass(tone),
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("size-full flex-1 transition-all", semanticProgressIndicatorClass(tone))}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
