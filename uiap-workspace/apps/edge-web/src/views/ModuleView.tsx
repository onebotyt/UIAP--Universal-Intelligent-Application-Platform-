import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export function ModuleView() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset state when moduleId changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    setError(false);
  }, [moduleId]);

  if (!moduleId) {
    return <div className="uiap-empty">No module selected</div>;
  }

  const src = `/api/m/${moduleId}/ui/index.html`;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--uiap-bg)',
            zIndex: 10,
          }}
        >
          <div className="uiap-spinner" /> Loading module UI...
        </div>
      )}

      {error ? (
        <div className="uiap-module-error">
          <div className="uiap-module-error-icon">🔌</div>
          <h2>Module UI Unavailable</h2>
          <p>
            The module "{moduleId}" may be disabled, uninstalled, or it does not provide a UI
            package.
          </p>
          <button
            className="uiap-btn uiap-btn-outline"
            onClick={() => {
              setLoading(true);

              setError(false);
              if (iframeRef.current) {
                iframeRef.current.src = src;
              }
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={src}
          className="uiap-module-frame"
          title={`Module UI: ${moduleId}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);

            setError(true);
          }}
        />
      )}
    </div>
  );
}
