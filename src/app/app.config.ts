import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHashbrown } from '@hashbrownai/angular';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideHashbrown({ baseUrl: environment.tutorUrl })],
};
