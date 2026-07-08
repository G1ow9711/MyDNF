import type { AudioPlaybackPlan, AudioPlaybackSink } from "./audio";

type BrowserAudioContextCtor = typeof AudioContext;

function noopSink(): AudioPlaybackSink {
  return {
    startMusic: () => undefined,
    playSfx: () => undefined
  };
}

function schedulePlan(context: AudioContext, plan: AudioPlaybackPlan): OscillatorNode[] {
  const startAt = context.currentTime;
  const nodes: OscillatorNode[] = [];

  for (const note of plan.notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startAt + note.startMs / 1000;
    const noteEnd = noteStart + note.durationMs / 1000;

    oscillator.type = note.waveform;
    oscillator.frequency.setValueAtTime(note.frequencyHz, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(Math.max(note.effectiveGain, 0.0001), noteStart + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.03);
    nodes.push(oscillator);
  }

  return nodes;
}

export function createBrowserAudioSink(): AudioPlaybackSink {
  const AudioCtor =
    globalThis.AudioContext ??
    (globalThis as typeof globalThis & { webkitAudioContext?: BrowserAudioContextCtor }).webkitAudioContext;

  if (!AudioCtor || typeof globalThis.setInterval !== "function" || typeof globalThis.clearInterval !== "function") {
    return noopSink();
  }

  let context: AudioContext | undefined;
  let musicTimer: ReturnType<typeof globalThis.setInterval> | undefined;
  let activeMusicNodes: OscillatorNode[] = [];
  let disabled = false;

  function ensureContext(): AudioContext {
    if (disabled) {
      throw new Error("Audio sink disabled");
    }

    context ??= new AudioCtor();

    if (context.state === "suspended") {
      void context.resume();
    }

    return context;
  }

  function clearMusicLoop(): void {
    if (musicTimer !== undefined) {
      globalThis.clearInterval(musicTimer);
      musicTimer = undefined;
    }

    for (const node of [...activeMusicNodes]) {
      try {
        node.stop();
      } catch {
        // Nodes may already have a scheduled stop; cancellation is best effort.
      }
    }

    activeMusicNodes = [];
  }

  function trackMusicNodes(nodes: OscillatorNode[]): void {
    for (const node of nodes) {
      activeMusicNodes.push(node);
      node.onended = () => {
        activeMusicNodes = activeMusicNodes.filter((activeNode) => activeNode !== node);
      };
    }
  }

  function withAudioGuard(operation: () => void): void {
    if (disabled) {
      return;
    }

    try {
      operation();
    } catch {
      disabled = true;
      clearMusicLoop();
    }
  }

  return {
    startMusic(plan: AudioPlaybackPlan): void {
      withAudioGuard(() => {
        const audioContext = ensureContext();

        clearMusicLoop();
        trackMusicNodes(schedulePlan(audioContext, plan));

        if (plan.loopMs > 0) {
          musicTimer = globalThis.setInterval(() => {
            withAudioGuard(() => {
              trackMusicNodes(schedulePlan(audioContext, plan));
            });
          }, plan.loopMs);
        }
      });
    },
    playSfx(plan: AudioPlaybackPlan): void {
      withAudioGuard(() => schedulePlan(ensureContext(), plan));
    }
  };
}
