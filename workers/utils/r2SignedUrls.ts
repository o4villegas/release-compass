import { AwsClient } from 'aws4fetch';

/**
 * Generate a presigned download URL for R2
 * Valid for 1 hour
 */
export async function generateDownloadUrl(
  storageKey: string,
  bucketName: string,
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string
): Promise<string> {
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  });

  const url = new URL(
    `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${storageKey}`
  );

  url.searchParams.set('X-Amz-Expires', '3600'); // 1 hour

  const signed = await client.sign(new Request(url.toString(), { method: 'GET' }), {
    aws: { signQuery: true },
  });

  return signed.url;
}

/**
 * Generate a presigned upload URL for R2
 * Valid for 1 hour
 */
export async function generateUploadUrl(
  storageKey: string,
  contentType: string,
  bucketName: string,
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string
): Promise<string> {
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  });

  const url = new URL(
    `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${storageKey}`
  );

  url.searchParams.set('X-Amz-Expires', '3600'); // 1 hour

  const signed = await client.sign(
    new Request(url.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
    }),
    { aws: { signQuery: true } }
  );

  return signed.url;
}
