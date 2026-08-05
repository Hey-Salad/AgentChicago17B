import { defineSandbox } from 'eve/sandbox'
import { vercel } from 'eve/sandbox/vercel'

/**
 * On Vercel: Sandbox microVMs. Keep definition minimal so template prewarm succeeds.
 * Local `eve dev` still uses defaultBackend if you delete/override this file.
 */
export default defineSandbox({
  backend: vercel({
    resources: { vcpus: 2 },
    networkPolicy: 'allow-all',
  }),
})
