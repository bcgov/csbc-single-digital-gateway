import { test as setup } from '@playwright/test';
import { platformLogin } from './platform.services.utils';

setup('authenticate', async ({ page }) => {
  await platformLogin(page);
});
