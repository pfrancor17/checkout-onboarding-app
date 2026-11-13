import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { HealthController } from './../src/health/health.controller';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;
  const dataSource = { query: jest.fn() };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: dataSource }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health -> 200 when the database is up', () => {
    dataSource.query.mockResolvedValue([]);
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('GET /api/health -> 503 when the database is down', () => {
    dataSource.query.mockRejectedValue(new Error('down'));
    return request(app.getHttpServer()).get('/api/health').expect(503);
  });
});
