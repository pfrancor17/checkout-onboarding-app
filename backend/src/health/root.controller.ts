import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { API_DOCS_PATH } from '../shared/infrastructure/http/global-prefix';

/** Visiting the API's bare domain sends you to the interactive docs. */
@ApiExcludeController()
@Controller()
export class RootController {
  @Get()
  @Redirect(API_DOCS_PATH, 302)
  root(): { url: string } {
    return { url: API_DOCS_PATH };
  }
}
