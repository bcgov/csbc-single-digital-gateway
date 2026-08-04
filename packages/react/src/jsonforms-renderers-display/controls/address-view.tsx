import {
  addressDisplayLines,
  isAddressEmpty,
  normalizeAddress,
} from '../../jsonforms-renderers/controls/address/model';
import { EmptyValue } from '../util/display-field';

/**
 * Read-only presentational view of an address value (feature 153). `value` is the raw `data` blob; it
 * is normalized so a partial or hand-edited value never throws. Renders the address in postal order
 * (line 1 / line 2 / city province postal / country), one line per row; an em-dash when empty.
 *
 * Exported from `jsonforms-renderers-display` so apps can render an address OUTSIDE a JsonForms
 * dispatch (e.g. a citizen portal review section), mirroring `ContactMethodsView`.
 */
export function AddressView({ value }: { value: unknown }) {
  const address = normalizeAddress(value);
  if (isAddressEmpty(address)) {
    return <EmptyValue />;
  }
  const lines = addressDisplayLines(address);
  return (
    <div className="flex flex-col">
      {lines.map((line, index) => (
        <span key={index} className="text-sm text-foreground">
          {line}
        </span>
      ))}
    </div>
  );
}
