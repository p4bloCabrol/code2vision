import { useRef, useEffect, useState } from 'react'

interface Props {
  url: string
}

export default function PreviewFrame({ url }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setError(false)
  }, [url])

  return (
    <div className="preview-frame">
      <div className="preview-toolbar">
        <span className="preview-url">{url}</span>
        <button
          className="preview-refresh"
          onClick={() => {
            if (iframeRef.current) {
              iframeRef.current.src = url
              setLoaded(false)
              setError(false)
            }
          }}
          title="Refresh"
        >
          ↺
        </button>
      </div>

      <div className="preview-body">
        {!loaded && !error && (
          <div className="preview-loading">Connecting to {url}...</div>
        )}
        {error && (
          <div className="preview-error">
            <p>Could not load {url}</p>
            <p className="preview-error-hint">Make sure your dev server is running.</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={url}
          title="Dev server preview"
          className="preview-iframe"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        />
      </div>
    </div>
  )
}
