import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { BUSINESS_PARAMETER_IDS, normalizeBusinessParameters } from './businessParameters';

describe('normalizeBusinessParameters', () => {
  it('defaults enable_barcode_scanner to true when parameters are missing', () => {
    const result = normalizeBusinessParameters(null as any);

    assert.equal(result[BUSINESS_PARAMETER_IDS.ENABLE_BARCODE_SCANNER], true);
    assert.equal(result[BUSINESS_PARAMETER_IDS.AUTO_OPEN_ITEM_CREATE_ON_UNKNOWN_BARCODE], true);
  });

  it('defaults enable_barcode_scanner to true when business_parameters is absent', () => {
    const result = normalizeBusinessParameters({ id: 1 } as any);

    assert.equal(result[BUSINESS_PARAMETER_IDS.ENABLE_BARCODE_SCANNER], true);
    assert.equal(result[BUSINESS_PARAMETER_IDS.AUTO_OPEN_ITEM_CREATE_ON_UNKNOWN_BARCODE], true);
  });

  it('preserves explicit enable_barcode_scanner=false values', () => {
    const result = normalizeBusinessParameters({
      business_parameters: {
        [BUSINESS_PARAMETER_IDS.ENABLE_BARCODE_SCANNER]: false,
        [BUSINESS_PARAMETER_IDS.AUTO_OPEN_ITEM_CREATE_ON_UNKNOWN_BARCODE]: false,
      },
    } as any);

    assert.equal(result[BUSINESS_PARAMETER_IDS.ENABLE_BARCODE_SCANNER], false);
    assert.equal(result[BUSINESS_PARAMETER_IDS.AUTO_OPEN_ITEM_CREATE_ON_UNKNOWN_BARCODE], false);
  });
});
