# Inqudex

Desktop toolkit for SEO automation, indexing pipelines, search analytics, and organic traffic simulation. Built with Nuxt 4, Tauri 2, and Nuxt UI.

## Features

- **Traffic Simulation & Pacing Engine**:
  - Multi-worker concurrent HTTP/HTTPS and SOCKS5 request engine.
  - Search engine referrer simulation (Google, Bing, Yahoo, DuckDuckGo, Yandex, Baidu, Ask, AOL) with dynamic keyword rotators.
  - Social and referral traffic rotation (X/Twitter, Reddit, LinkedIn, Facebook, Medium, and custom referrers).
  - Campaign UTM builder (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`).
  - Deep surfing mode with same-origin crawling and randomized dwell time.
  - Proxy manager with parallel latency testing, live health check, and auto-dead failover.
  - Optimization presets (Max Sessions, Max Pageviews, Low Bounce Rate, High Bounce Rate).
  - Real-time telemetry dashboard with live latency, throughput (hits/min), and activity logging with CSV export.
- **Search Console Hub**:
  - Integration with `gscdump` for query, page, and indexing evidence retrieval.
- **Batch Indexing**:
  - Indexing submission workflows via Google Indexing API and IndexNow.
- **Site Audit & Diagnostics**:
  - On-page technical SEO scanner, status code inspector, and internal link crawler.
- **Sitemap Analyzer**:
  - XML sitemap parser and batch URL extractor.
- **Keyword Research**:
  - Real-time search suggestion extraction and phrase expansion.
- **PageSpeed Diagnostics**:
  - Core Web Vitals and Lighthouse metrics.

## Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com/) (Vue 3, Composition API)
- **Desktop Runtime**: [Tauri 2](https://tauri.app/) (Rust)
- **UI System**: [Nuxt UI v4](https://ui.nuxt.com/) & Tailwind CSS
- **Package Manager**: [Bun](https://bun.sh/)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.2
- [Rust](https://www.rust-lang.org/) & Cargo (for Tauri)

### Development

```bash
# Install dependencies
bun install

# Run development mode
bun run tauri:dev
```

### Build

```bash
# Build desktop binary
bun run tauri:build
```

## License

MIT © [narr07](https://github.com/narr07)
