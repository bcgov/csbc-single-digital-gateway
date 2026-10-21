export * from './form-studio';

/**
 * Doc 221: how a host tells the studio what a GOVERNING template permits.
 *
 * Exported from the STUDIO entry, not from `@repo/forms/capabilities` — that submodule must stay
 * React-free so feature 222's validator can run on the server — and not from `renderers/studio`,
 * whose barrel is a `RendererSet` and exports exactly four registries (doc 180).
 */
export {
  CapabilityProvider,
  grantsNothing,
  useCapabilities,
  useCapability,
} from '../renderers/studio/studio-capabilities';
