#!/bin/sh
# Wraps the shared Mealwise page (web/index.html) for the web host.
set -e
cd "$(dirname "$0")"
{
  printf '%s' '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#F5F0E2"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Mealwise"><meta name="description" content="Photograph or describe your meals; Mealwise logs them and reviews your day."><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style><script src="/runtime.js"></script></head><body>'
  cat web/index.html
  printf '%s\n' '</body></html>'
} > public/index.html
echo built public/index.html
