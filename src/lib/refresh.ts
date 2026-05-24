const DEFAULT_MINIMUM_SPINNER_MS = 320;

function delay(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

export async function waitForMinimumSpinner(
  startedAt: number | null,
  minimumMs = DEFAULT_MINIMUM_SPINNER_MS,
) {
  if (startedAt === null) {
    return;
  }

  const elapsedMs = performance.now() - startedAt;
  const remainingMs = minimumMs - elapsedMs;

  if (remainingMs > 0) {
    await delay(remainingMs);
  }
}
