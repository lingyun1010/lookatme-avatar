# Verification

- npm install completed successfully (26 audited packages, no vulnerabilities reported at verification time).
- npm test: four passing geometry/map-validation tests.
- npm run build: TypeScript, production demo, library declarations, and standalone vanilla bundle succeeded.
- npm pack: installable package generated; vanilla bundle is approximately 6.4 KiB uncompressed.
- Python unittest: two passing tests covering explicit selections, alpha/resize preservation, overwrite refusal, unsafe keys, and contact-sheet pagination.
- Full reference source video: 121 decoded frames extracted; two candidate contact-sheet pages produced; all 17 selected frames packaged with mapping and preview.
- Browser: React demo loaded; pointer to right selected east; pointer to centre restored neutral.
- Production demo loaded at /lookatme/ under a plain static HTTP server. All 17 images decoded; exactly one visible.
- Responsive check at 390px viewport: no horizontal overflow.
- Generated vanilla preview loaded and changed frames with pointer input. Raw video background and watermark are preserved; background removal is intentionally outside v1.
- GitHub Pages workflow provided but not executed remotely.
