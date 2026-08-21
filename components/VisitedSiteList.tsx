import { useTranslation } from '../hooks/useTranslation';
import type { VisitedSite } from '../utils/clearing';
import { ClearableList } from './ClearableList';

interface VisitedSiteListProps {
  sites: VisitedSite[];
  busyHostnames: Set<string>;
  failedHostnames: Set<string>;
  onClear: (site: VisitedSite) => void;
}

export function VisitedSiteList({ sites, busyHostnames, failedHostnames, onClear }: VisitedSiteListProps) {
  const t = useTranslation();

  return (
    <ClearableList
      items={sites}
      keyOf={(site) => site.hostname}
      emptyLabel={t('noMatchingSites')}
      renderRow={(site) => <span className="text-sm truncate min-w-0">{site.hostname}</span>}
      buttonLabel={(site) => {
        if (busyHostnames.has(site.hostname)) return t('clearing');
        if (failedHostnames.has(site.hostname)) return t('failed');
        return t('clear');
      }}
      buttonDisabled={(site) => busyHostnames.has(site.hostname)}
      onClear={onClear}
    />
  );
}
