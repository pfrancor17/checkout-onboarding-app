import { RequestMethod } from '@nestjs/common';
import { GlobalPrefixOptions } from '@nestjs/common/interfaces/global-prefix-options.interface';

/** Every endpoint lives under /api. */
export const GLOBAL_PREFIX = 'api';

/** Path of the Swagger UI. */
export const API_DOCS_PATH = `/${GLOBAL_PREFIX}/docs`;

/**
 * The bare domain (GET /) is left out of the prefix so it can redirect to
 * the docs instead of answering 404.
 */
export const GLOBAL_PREFIX_OPTIONS: GlobalPrefixOptions = {
  exclude: [{ path: '/', method: RequestMethod.GET }],
};
