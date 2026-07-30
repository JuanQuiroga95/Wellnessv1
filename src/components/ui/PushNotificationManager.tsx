'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Push Notification Manager ──────────────────────────────────────────────
// This component handles the push notification permission flow.
// It shows a banner suggesting to enable notifications, and manages
// the subscription lifecycle (subscribe/unsubscribe).
//
// Usage: <PushNotificationManager /> — mount in coach or player layout

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Check current state on mount
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission)

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub)
        // Show banner if not subscribed and not denied and not previously dismissed
        const wasDismissed = localStorage.getItem('wp-push-dismissed')
        if (!sub && Notification.permission !== 'denied' && !wasDismissed) {
          // Delay showing the banner for a smoother UX
          setTimeout(() => setShowBanner(true), 3000)
        }
      })
    })
  }, [])

  const subscribe = useCallback(async () => {
    setLoading(true)
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('[Push] VAPID key not configured')
        alert('Error: claves VAPID no configuradas. Contactá al administrador.')
        setShowBanner(false)
        setLoading(false)
        return
      }

      // Request notification permission
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        setShowBanner(false)
        setLoading(false)
        return
      }

      // Wait for service worker with a timeout
      const swReady = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 8000))
      ]) as ServiceWorkerRegistration

      const subscription = await swReady.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      })

      // Send subscription to backend (non-blocking — don't let a backend error trap the user)
      try {
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        })
        if (!res.ok) console.error('[Push] Backend save failed:', res.status, await res.text().catch(() => ''))
      } catch (fetchErr) {
        console.error('[Push] Backend fetch error:', fetchErr)
      }

      // Permission granted + subscription created = success even if backend hiccups
      setIsSubscribed(true)
      setShowBanner(false)
      localStorage.setItem('wp_push_dismissed', '1')
    } catch (err) {
      console.error('[Push] Subscribe error:', err)
      // Still hide the banner so user isn't stuck
      setShowBanner(false)
    }
    setLoading(false)
  }, [])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()

      if (sub) {
        // Remove from backend
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }

      setIsSubscribed(false)
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err)
    }
    setLoading(false)
  }, [])

  const dismissBanner = useCallback(() => {
    setShowBanner(false)
    setDismissed(true)
    localStorage.setItem('wp-push-dismissed', '1')
  }, [])

  // Don't render anything if unsupported or denied
  if (permission === 'unsupported') return null

  // Floating banner suggesting to enable notifications
  if (showBanner && !isSubscribed && !dismissed) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 20,
        left: 16,
        right: 16,
        margin: '0 auto',
        maxWidth: 400,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid rgba(200,241,53,.3)',
        borderRadius: 14,
        padding: '16px',
        zIndex: 9999,
        boxShadow: '0 8px 32px rgba(0,0,0,.5)',
        animation: 'slideUp .4s cubic-bezier(.16,1,.3,1) both',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ fontSize: 24, lineHeight: 1 }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 2 }}>
              Activar notificaciones
            </div>
            <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.4 }}>
              Recibí alertas de cumpleaños, partidos, sesiones y recordatorios de wellness directamente en tu celular.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            onClick={dismissBanner}
            style={{
              background: 'transparent',
              border: '1px solid #444',
              borderRadius: 10,
              padding: '8px 16px',
              color: '#888',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              flex: '1 1 auto',
              whiteSpace: 'nowrap',
              textAlign: 'center'
            }}
          >
            Más tarde
          </button>
          <button
            onClick={subscribe}
            disabled={loading}
            style={{
              background: 'var(--lime)',
              border: 'none',
              borderRadius: 10,
              padding: '8px 16px',
              color: '#080808',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'inherit',
              flex: '1 1 auto',
              whiteSpace: 'nowrap',
              textAlign: 'center'
            }}
          >
            {loading ? 'Activando...' : 'Activar'}
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ─── Toggle component for settings panels ───────────────────────────────────
// Use this inside coach/player notification preferences sections

export function PushToggle({ onSubscriptionChange }: { onSubscriptionChange?: (subscribed: boolean) => void }) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      return
    }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub)
      })
    })
  }, [])

  const toggle = async () => {
    setLoading(true)
    try {
      if (isSubscribed) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setIsSubscribed(false)
        onSubscriptionChange?.(false)
      } else {
        // Subscribe
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) { setLoading(false); return }

        const perm = await Notification.requestPermission()
        if (perm !== 'granted') { setLoading(false); return }

        const reg = await navigator.serviceWorker.ready
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
        })

        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        })

        if (res.ok) {
          setIsSubscribed(true)
          onSubscriptionChange?.(true)
        }
      }
    } catch (err) {
      console.error('[Push] Toggle error:', err)
    }
    setLoading(false)
  }

  if (!supported) {
    return (
      <div style={{ fontSize: 12, color: '#888', padding: '8px 0' }}>
        Tu navegador no soporta notificaciones push.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={toggle}
        disabled={loading}
        style={{
          position: 'relative',
          width: 48,
          height: 26,
          borderRadius: 13,
          border: 'none',
          background: isSubscribed ? '#c8f135' : '#333',
          cursor: loading ? 'default' : 'pointer',
          transition: 'background .2s',
          flexShrink: 0,
          opacity: loading ? 0.5 : 1,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 3,
          left: isSubscribed ? 25 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.3)',
        }} />
      </button>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: isSubscribed ? '#c8f135' : '#888' }}>
          {isSubscribed ? '✓ Notificaciones activas' : 'Notificaciones desactivadas'}
        </div>
        {Notification.permission === 'denied' && (
          <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>
            Bloqueadas en el navegador. Desbloqueá en Ajustes del navegador.
          </div>
        )}
      </div>
    </div>
  )
}
