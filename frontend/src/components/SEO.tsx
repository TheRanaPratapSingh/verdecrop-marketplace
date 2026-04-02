import React from 'react'
import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'Graamo'
const BASE_URL  = 'https://graamo.in'   // canonical root — update when domain is live
const DEFAULT_TITLE       = 'Graamo – Organic Marketplace'
const DEFAULT_DESCRIPTION = 'Buy 100% certified organic vegetables, fruits, grains & more directly from 500+ trusted Indian farmers. No chemicals, no middlemen – farm fresh to your door.'
const DEFAULT_OG_IMAGE    = `${BASE_URL}/og-default.jpg`   // 1200×630 image in /public

interface SEOProps {
  /** Browser tab + og:title (appends " | Graamo" automatically unless overridden) */
  title?: string
  /** Meta description — keep under 155 chars */
  description?: string
  /** Absolute canonical URL for this page */
  canonical?: string
  /** Absolute URL of the OG share image (1200×630 recommended) */
  image?: string
  /** og:type — defaults to "website"; use "article" for blog posts */
  type?: 'website' | 'article'
  /** Prevent indexing (login, checkout, admin pages) */
  noIndex?: boolean
  /** Override the full <title> tag without the site suffix */
  titleOverride?: string
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  noIndex = false,
  titleOverride,
}) => {
  const fullTitle = titleOverride ?? (title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE)
  const pageUrl   = canonical ?? (typeof window !== 'undefined' ? window.location.href : BASE_URL)
  const desc      = description.slice(0, 155)   // hard-cap at 155 chars

  return (
    <Helmet>
      {/* ── Primary ──────────────────────────────────────────────── */}
      <title>{fullTitle}</title>
      <meta name="description"        content={desc} />
      <link rel="canonical"           href={pageUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* ── Viewport (safety net — also in index.html) ───────────── */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      {/* ── Open Graph ───────────────────────────────────────────── */}
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:type"        content={type} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url"         content={pageUrl} />
      <meta property="og:image"       content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale"      content="en_IN" />

      {/* ── Twitter Card ─────────────────────────────────────────── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content="@GraamoIndia" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image"       content={image} />
    </Helmet>
  )
}

export default SEO
