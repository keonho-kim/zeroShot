export function AgentLoadingStage(props: { label: string; phase?: "starting" | "running" }) {
  const phase = props.phase ?? "starting";

  return (
    <div className={`agent-loading-stage ${phase}`} role="status" aria-live="polite">
      {phase === "running" ? (
        <span className="agent-running-pulse" aria-hidden="true" />
      ) : (
        <span className="agent-dot-wave" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
      <h2>{props.label}</h2>
    </div>
  );
}
