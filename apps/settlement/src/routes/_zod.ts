/**
 * Re-export of zod from @tollgate/shared (which depends on zod) so that
 * settlement routes can validate request bodies. We avoid adding zod as a
 * direct dependency of settlement to keep dependencies tight.
 */
export { z } from 'zod'
