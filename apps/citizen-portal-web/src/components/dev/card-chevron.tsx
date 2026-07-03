import { mdiChevronRight } from '@mdi/js';
import { Icon } from '@mdi/react';

export function CardChevron() {
  return (
    <div className="px-4">
      <Icon path={mdiChevronRight} size="20px" className="text-link" aria-hidden="true" />
    </div>
  );
}
