import { RootController } from './root.controller';

describe('RootController', () => {
  it('points the bare domain to the Swagger docs', () => {
    expect(new RootController().root()).toEqual({ url: '/api/docs' });
  });
});
