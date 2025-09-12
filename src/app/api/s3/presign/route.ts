import { NextRequest } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function createS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { key: string; contentType: string }
    if (!body?.key || !body?.contentType) {
      return Response.json({ error: 'Missing key or contentType' }, { status: 400 })
    }

    const bucket = process.env.AWS_S3_BUCKET
    if (!bucket) return Response.json({ error: 'Server misconfigured' }, { status: 500 })

    const client = createS3Client()
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: body.key,
      ContentType: body.contentType,
    })
    const url = await getSignedUrl(client, command, { expiresIn: 60 })
    return Response.json({ url })
  } catch (error) {
    return Response.json({ error: 'Failed to presign' }, { status: 500 })
  }
}


