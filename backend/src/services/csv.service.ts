/**
 * csv.service.ts
 *
 * Handles the 3-step CSV import flow:
 *   1. upload()   — parses file, stores raw data, returns headers + preview
 *   2. setMapping() — saves the user's column → field mapping
 *   3. confirm()  — applies mapping, bulk-creates records, marks import complete
 */

import { parse } from 'csv-parse/sync';
import { prisma } from '../utils/prisma';
import { EntityService } from './entity.service';
import { AppError } from '../middleware/errorHandler';
import type { CsvUploadResponse, CsvImportResult } from '../../../shared/types/api';
import type { NormalizedConfig, EntityDefinition } from '../../../shared/types/config';

const entityService = new EntityService();

export class CsvService {
  /**
   * Step 1 — Parse uploaded CSV and store raw data in DB.
   * Returns headers and a preview of up to 5 rows.
   */
  async upload(
    userId: string,
    entityName: string,
    fileBuffer: Buffer,
    filename: string,
  ): Promise<CsvUploadResponse> {
    let rows: Record<string, string>[];

    try {
      rows = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as Record<string, string>[];
    } catch (err) {
      throw new AppError(400, 'Failed to parse CSV file. Please ensure it is valid UTF-8 CSV.', 'CSV_PARSE_ERROR');
    }

    if (rows.length === 0) {
      throw new AppError(400, 'CSV file is empty', 'CSV_EMPTY');
    }

    const headers = Object.keys(rows[0]);

    const csvImport = await prisma.csvImport.create({
      data: {
        userId,
        entityName,
        filename,
        rowCount: rows.length,
        status: 'pending',
        rawData: rows as unknown as object,
      },
    });

    return {
      importId: csvImport.id,
      filename,
      headers,
      preview: rows.slice(0, 5),
    };
  }

  /**
   * Step 2 — Save the user's column mapping.
   */
  async setMapping(
    userId: string,
    importId: string,
    mapping: Record<string, string>,
  ): Promise<void> {
    const csvImport = await prisma.csvImport.findFirst({ where: { id: importId, userId } });
    if (!csvImport) throw new AppError(404, 'Import session not found', 'IMPORT_NOT_FOUND');
    if (csvImport.status === 'complete') throw new AppError(409, 'Import already completed', 'ALREADY_COMPLETE');

    await prisma.csvImport.update({
      where: { id: importId },
      data: { mapping: mapping as object, status: 'mapped' },
    });
  }

  /**
   * Step 3 — Apply mapping and write records to the entity store.
   */
  async confirm(
    userId: string,
    importId: string,
    config: NormalizedConfig,
  ): Promise<CsvImportResult> {
    const csvImport = await prisma.csvImport.findFirst({ where: { id: importId, userId } });
    if (!csvImport) throw new AppError(404, 'Import session not found', 'IMPORT_NOT_FOUND');
    if (csvImport.status === 'complete') throw new AppError(409, 'Import already completed', 'ALREADY_COMPLETE');
    if (csvImport.status !== 'mapped') throw new AppError(400, 'Column mapping not set. Complete step 2 first.', 'NOT_MAPPED');

    const mapping = csvImport.mapping as Record<string, string>;
    const rawData = csvImport.rawData as Record<string, string>[];
    const entity = config.entities.find((e) => e.name === csvImport.entityName);

    const errors: Array<{ row: number; reason: string }> = [];
    const validRows: Record<string, unknown>[] = [];

    rawData.forEach((row, idx) => {
      try {
        const mapped: Record<string, unknown> = {};

        // Apply column mapping
        for (const [csvCol, entityField] of Object.entries(mapping)) {
          if (entityField && row[csvCol] !== undefined) {
            mapped[entityField] = row[csvCol];
          }
        }

        // Apply type coercions from entity config
        if (entity) {
          for (const field of entity.fields) {
            if (mapped[field.name] !== undefined) {
              mapped[field.name] = coerceValue(mapped[field.name] as string, field);
            }
          }
        }

        validRows.push(mapped);
      } catch (err) {
        errors.push({ row: idx + 2, reason: err instanceof Error ? err.message : 'Unknown error' });
      }
    });

    if (validRows.length > 0) {
      await entityService.bulkCreate(userId, csvImport.entityName, validRows);
    }

    await prisma.csvImport.update({
      where: { id: importId },
      data: { status: 'complete', errors: errors as unknown as object },
    });

    return { imported: validRows.length, failed: errors.length, errors };
  }
}

function coerceValue(raw: string, field: EntityDefinition['fields'][number]): unknown {
  if (raw === '' || raw === null || raw === undefined) return undefined;

  switch (field.type) {
    case 'number': {
      const n = Number(raw);
      return isNaN(n) ? undefined : n;
    }
    case 'boolean':
      return raw.toLowerCase() === 'true' || raw === '1';
    default:
      return raw;
  }
}
