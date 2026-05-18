export function AgentLoadingStage(props: { label: string }) {
  return (
    <div className="agent-loading-stage" role="status" aria-live="polite">
      <span className="agent-dot-wave" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <h2>{props.label}</h2>
    </div>
  );
}
