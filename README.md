# VR-House

Next.js App Router (TypeScript) with Tailwind and S3 presign API scaffold.

## Dev

```bash
# yarn
yarn

# env
cp .env.example .env.local

# dev
yarn dev
```

## S3 Presign API
- POST `/api/s3/presign` with JSON `{ key, contentType }`
- Requires `AWS_REGION`, `AWS_S3_BUCKET` and optional `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or use an IAM role in hosting).

## Panorama test
- Put a single equirectangular image at `public/vr/test/pano.jpg` (recommend WebP: `pano.webp`).
- Open `/vr/test` to view and drag/zoom.
- For S3: set `NEXT_PUBLIC_ASSETS_BASE_URL` and keep the same path (`/vr/test/pano.jpg`).


