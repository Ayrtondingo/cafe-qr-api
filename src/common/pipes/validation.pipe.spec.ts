import { Type } from 'class-transformer';
import { IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { AppException } from '../exceptions/app.exception';
import { createValidationPipe } from './validation.pipe';

class ItemDto {
  @IsInt()
  @Min(1)
  cantidad!: number;
}

class EjemploDto {
  @IsString()
  nota!: string;

  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items!: ItemDto[];
}

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();
  const metadata = { type: 'body' as const, metatype: EjemploDto };

  const fallaCon = async (payload: unknown): Promise<AppException> => {
    try {
      await pipe.transform(payload, metadata);
    } catch (error) {
      return error as AppException;
    }
    throw new Error('Se esperaba un error de validación');
  };

  it('acepta un payload válido', async () => {
    await expect(
      pipe.transform({ nota: 'sin azúcar', items: [{ cantidad: 2 }] }, metadata),
    ).resolves.toBeInstanceOf(EjemploDto);
  });

  it('rechaza un localId enviado por el cliente', async () => {
    const error = await fallaCon({ nota: 'x', items: [], localId: 'otro-local' });

    expect(error).toBeInstanceOf(AppException);
    expect(error.getStatus()).toBe(400);
    expect(error.detalles).toEqual({
      campos: [{ campo: 'localId', errores: ['property localId should not exist'] }],
    });
  });

  it('reporta errores anidados con la ruta completa', async () => {
    const error = await fallaCon({ nota: 'x', items: [{ cantidad: 0 }] });

    expect(error.codigo).toBe('VALIDACION');
    expect(error.detalles?.campos).toEqual([
      { campo: 'items.0.cantidad', errores: ['cantidad must not be less than 1'] },
    ]);
  });
});
