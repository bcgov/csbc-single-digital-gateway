import { createDatabase } from '@repo/db';
import { mockConfigService } from 'tests/utils/auth.controllers.mock';
import { DatabaseProvider } from '../database.provider';

jest.mock('@repo/db');
jest.mock('@nestjs/config');

describe('DatabaseProvider', () => {
  let mockCreateDatabase: jest.MockedFunction<typeof createDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateDatabase = jest.fn();
    (
      createDatabase as jest.MockedFunction<typeof createDatabase>
    ).mockImplementation(mockCreateDatabase);
  });

  it('Should call createDatabase with correct parameters from configService', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'DB_NAME':
          return 'test_db';
        case 'DB_HOST':
          return 'localhost';
        case 'DB_PORT':
          return 5432;
        case 'DB_USER':
          return 'user';
        case 'DB_PASS':
          return 'pass';
        case 'DB_SSL':
          return true;
        default:
          return undefined;
      }
    });

    const factory = DatabaseProvider.useFactory;
    factory(mockConfigService);

    expect(mockConfigService.get).toHaveBeenCalledWith('DB_NAME');
    expect(mockConfigService.get).toHaveBeenCalledWith('DB_HOST');
    expect(mockConfigService.get).toHaveBeenCalledWith('DB_PORT');
    expect(mockConfigService.get).toHaveBeenCalledWith('DB_USER');
    expect(mockConfigService.get).toHaveBeenCalledWith('DB_PASS');
    expect(mockConfigService.get).toHaveBeenCalledWith('DB_SSL');
    expect(mockCreateDatabase).toHaveBeenCalledWith({
      DB_NAME: 'test_db',
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_USER: 'user',
      DB_PASS: 'pass',
      DB_SSL: true,
    });
  });

  it('Should handle configService.get returning undefined', () => {
    mockConfigService.get.mockReturnValue(undefined);

    const factory = DatabaseProvider.useFactory;
    factory(mockConfigService);

    expect(mockCreateDatabase).toHaveBeenCalledWith({
      DB_NAME: undefined,
      DB_HOST: undefined,
      DB_PORT: undefined,
      DB_USER: undefined,
      DB_PASS: undefined,
      DB_SSL: undefined,
    });
  });

  it('Should handle configService.get returning null', () => {
    mockConfigService.get.mockReturnValue(null);

    const factory = DatabaseProvider.useFactory;
    factory(mockConfigService);

    expect(mockCreateDatabase).toHaveBeenCalledWith({
      DB_NAME: null,
      DB_HOST: null,
      DB_PORT: null,
      DB_USER: null,
      DB_PASS: null,
      DB_SSL: null,
    });
  });

  it('Should handle configService.get returning strings for numeric fields', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'DB_PORT') return '5432';
      return 'value';
    });

    const factory = DatabaseProvider.useFactory;
    factory(mockConfigService);

    expect(mockCreateDatabase).toHaveBeenCalledWith({
      DB_NAME: 'value',
      DB_HOST: 'value',
      DB_PORT: '5432',
      DB_USER: 'value',
      DB_PASS: 'value',
      DB_SSL: 'value',
    });
  });

  it('Should handle configService.get throwing an error', () => {
    mockConfigService.get.mockImplementation(() => {
      throw new Error('Config error');
    });

    const factory = DatabaseProvider.useFactory;

    expect(() => {
      factory(mockConfigService);
    }).toThrow('Config error');
    expect(mockCreateDatabase).not.toHaveBeenCalled();
  });

  it('Should handle createDatabase throwing an error', () => {
    mockConfigService.get.mockReturnValue('value');
    mockCreateDatabase.mockImplementation(() => {
      throw new Error('Create DB error');
    });

    const factory = DatabaseProvider.useFactory;

    expect(() => {
      factory(mockConfigService);
    }).toThrow('Create DB error');
  });

  it('Should handle configService being null', () => {
    const factory = DatabaseProvider.useFactory;

    expect(() => {
      factory(null as any);
    }).toThrow();
  });

  it('Should handle configService.get returning objects', () => {
    mockConfigService.get.mockReturnValue({ key: 'value' });

    const factory = DatabaseProvider.useFactory;
    factory(mockConfigService);

    expect(mockCreateDatabase).toHaveBeenCalledWith({
      DB_NAME: { key: 'value' },
      DB_HOST: { key: 'value' },
      DB_PORT: { key: 'value' },
      DB_USER: { key: 'value' },
      DB_PASS: { key: 'value' },
      DB_SSL: { key: 'value' },
    });
  });

  it('Should handle DB_SSL as false', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'DB_SSL') return false;
      return 'value';
    });

    const factory = DatabaseProvider.useFactory;
    factory(mockConfigService);

    expect(mockCreateDatabase).toHaveBeenCalledWith({
      DB_NAME: 'value',
      DB_HOST: 'value',
      DB_PORT: 'value',
      DB_USER: 'value',
      DB_PASS: 'value',
      DB_SSL: false,
    });
  });
});
