import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  const productsService = {
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: productsService },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('strips competitorId and relation payloads from PATCH bodies', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const result = await pipe.transform(
      {
        name: 'Leather tote',
        competitorId: 999,
        competitor: { connect: { id: 999 } },
        reviews: { deleteMany: {} },
      },
      { type: 'body', metatype: UpdateProductDto },
    );

    expect(result).toEqual({ name: 'Leather tote' });
    expect(result).not.toHaveProperty('competitorId');
    expect(result).not.toHaveProperty('competitor');
    expect(result).not.toHaveProperty('reviews');
  });

  it('forwards the sanitized DTO to the service', async () => {
    productsService.update.mockResolvedValue({ id: 10, name: 'Leather tote' });
    const user = { id: 7, name: 'Alish', email: 'alish@example.com' };

    await controller.update(user, 10, { name: 'Leather tote' });

    expect(productsService.update).toHaveBeenCalledWith(7, 10, {
      name: 'Leather tote',
    });
  });
});
