import { createBankEntriesRepo } from './bankEntries';
import { createCategoriesRepo } from './categories';
import type { RepoDeps } from './deps';
import { createEntriesRepo } from './entries';
import { createGroupsRepo } from './groups';
import { createIncomeRepo } from './income';
import { createOverridesRepo } from './overrides';
import { createRecurrencesRepo } from './recurrences';

export function createRepos(deps: RepoDeps) {
  return {
    groups: createGroupsRepo(deps),
    categories: createCategoriesRepo(deps),
    entries: createEntriesRepo(deps),
    recurrences: createRecurrencesRepo(deps),
    overrides: createOverridesRepo(deps),
    income: createIncomeRepo(deps),
    bankEntries: createBankEntriesRepo(deps),
  };
}

export type Repos = ReturnType<typeof createRepos>;
