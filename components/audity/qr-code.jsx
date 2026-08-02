'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ value, size = 168, className }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let active = true
    QRCode.toDataURL(String(value), {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0A0A0AFF', light: '#FFFFFFFF' },
    })
      .then((url) => {
        if (active) setSrc(url)
      })
      .catch(() => {
        if (active) setSrc('')
      })
    return () => {
      active = false
    }
  }, [value, size])

  if (!src) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, background: '#ffffff' }}
        aria-hidden="true"
      />
    )
  }

  return (
    <img
      src={src || '/placeholder.svg'}
      alt={`QR code encoding ${value}`}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  )
}
