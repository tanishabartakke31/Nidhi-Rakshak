import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Nidhi Rakshak - Asset Management & Protection',
  description: 'Secure your financial assets today, safeguard tomorrow with Nidhi Rakshak - Government-backed asset protection platform',
  generator: 'v0.app',
  icons: {
    icon: '/nidhi-rakshak-logo.png',
    apple: '/nidhi-rakshak-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
