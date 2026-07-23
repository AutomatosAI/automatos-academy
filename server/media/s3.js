// S3 for the media plane (PRD-WAVE-CONTENT-OPS C3) — the FIRST presigned-PUT
// in the family (widget-sdk + automatos-ai only ever presign GET). The AWS
// SDK is imported lazily so a deploy without creds (or without the packages)
// boots fine and the endpoints answer 503 not_configured, never crash.
//
// Reuses the SAME env values as the deploy workflow (AWS_SDK_DEPLOY_*) so
// there is one AWS identity to reason about; on the server they are Railway
// env vars, never in the public repo.

export function mediaS3FromEnv(env = process.env) {
  const bucket = env.AWS_SDK_DEPLOY_BUCKET;
  const region = env.AWS_SDK_DEPLOY_REGION;
  const accessKeyId = env.AWS_SDK_DEPLOY_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SDK_DEPLOY_SECRET_ACCESS_KEY;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) return null;
  return createMediaS3({ bucket, region, accessKeyId, secretAccessKey });
}

export function createMediaS3({ bucket, region, accessKeyId, secretAccessKey }) {
  let clientPromise;
  const getClient = () => {
    if (!clientPromise) {
      clientPromise = (async () => {
        const { S3Client } = await import("@aws-sdk/client-s3");
        return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
      })();
    }
    return clientPromise;
  };

  return {
    bucket,

    async presignPut(key, contentType, expiresSec = 900) {
      const [{ PutObjectCommand }, { getSignedUrl }] = await Promise.all([
        import("@aws-sdk/client-s3"),
        import("@aws-sdk/s3-request-presigner"),
      ]);
      const client = await getClient();
      return getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
        { expiresIn: expiresSec },
      );
    },

    async headObject(key) {
      const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await getClient();
      try {
        const r = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { exists: true, size: r.ContentLength ?? null, contentType: r.ContentType ?? null };
      } catch (e) {
        const code = e && e.$metadata && e.$metadata.httpStatusCode;
        if (code === 404 || code === 403 || (e && e.name === "NotFound")) return { exists: false };
        throw e;
      }
    },
  };
}
