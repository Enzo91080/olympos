import { ServiceUnavailableException } from '@nestjs/common';

const generateMock = jest.fn();

jest.mock('ollama', () => ({
  Ollama: jest.fn().mockImplementation(() => ({
    generate: generateMock,
  })),
}));

import { OracleService } from './oracle.service';

function* fakeStream(chunks: string[]) {
  for (const response of chunks) {
    yield { response };
  }
}

let service: OracleService;

beforeEach(() => {
  generateMock.mockReset();
  service = new OracleService();
});

describe('streamAnswer', () => {
  it('transmet chaque token reçu du flux Ollama', async () => {
    generateMock.mockResolvedValue(
      fakeStream(['Les ', 'dieux ', 'te ', 'guident.']),
    );
    const tokens: string[] = [];

    await service.streamAnswer('Quelle stratégie adopter ?', (t) =>
      tokens.push(t),
    );

    expect(tokens).toEqual(['Les ', 'dieux ', 'te ', 'guident.']);
  });

  it('throw ServiceUnavailableException si Ollama est injoignable (ECONNREFUSED)', async () => {
    generateMock.mockRejectedValue({ cause: { code: 'ECONNREFUSED' } });

    await expect(
      service.streamAnswer('question', () => undefined),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('propage les autres erreurs telles quelles', async () => {
    const err = new Error('boom');
    generateMock.mockRejectedValue(err);

    await expect(
      service.streamAnswer('question', () => undefined),
    ).rejects.toThrow('boom');
  });
});
