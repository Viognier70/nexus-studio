import { strings } from '../content/strings.sv';

export function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

interface Props {
  onRestart?: () => void;
}

export function WebGLFallback({ onRestart }: Props) {
  const { title, body, quote, restart } = strings.webglFallback;
  return (
    <div className="fallback" role="alert">
      <h1>{title}</h1>
      <p>{body}</p>
      <blockquote>{quote}</blockquote>
      {onRestart && (
        <button type="button" className="btn" onClick={onRestart}>
          {restart}
        </button>
      )}
    </div>
  );
}
