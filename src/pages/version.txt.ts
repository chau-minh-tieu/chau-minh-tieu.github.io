/**
 * /version.txt: the commit this build came from, like the git section of a
 * service's info endpoint. GitHub Actions sets GITHUB_SHA; local builds say
 * "local". scripts/smoke.ts waits until the live site serves the commit it
 * expects before it checks anything else.
 */
export function GET() {
  return new Response(`${process.env.GITHUB_SHA || 'local'}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
