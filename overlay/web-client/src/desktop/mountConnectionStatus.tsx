/**
 * Mounts the connection indicator in its own React root, outside the app's tree, so no upstream
 * component has to be patched to host it.
 */
import { createRoot } from 'react-dom/client'
import { ConnectionStatus } from './ConnectionStatus'

export function mountConnectionStatus(): void {
  const mount = () => {
    if (document.getElementById('argentum-connection-status')) return

    const style = document.createElement('style')
    style.textContent = '@keyframes argentum-net-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.25 } }'
    document.head.appendChild(style)

    const host = document.createElement('div')
    host.id = 'argentum-connection-status'
    document.body.appendChild(host)
    createRoot(host).render(<ConnectionStatus />)
  }

  if (document.body) mount()
  else document.addEventListener('DOMContentLoaded', mount, { once: true })
}
