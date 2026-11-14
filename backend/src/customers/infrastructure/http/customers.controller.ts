import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { maskEmail, maskPhone } from '../../../shared/domain/masking';
import { toHttpException } from '../../../shared/infrastructure/http/app-error.mapper';
import { GetCustomerUseCase } from '../../application/get-customer.use-case';
import { Customer } from '../../domain/customer';

export class CustomerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  fullName!: string;

  @ApiProperty({ example: 'j***@example.com', description: 'Masked' })
  email!: string;

  @ApiProperty({ example: '******4567', description: 'Masked' })
  phone!: string;

  @ApiProperty()
  createdAt!: Date;

  static fromDomain(customer: Customer): CustomerResponseDto {
    return {
      id: customer.id,
      fullName: customer.fullName,
      email: maskEmail(customer.email),
      phone: maskPhone(customer.phone),
      createdAt: customer.createdAt,
    };
  }
}

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly getCustomer: GetCustomerUseCase) {}

  @Get(':id')
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse({ description: 'The id is not a valid UUID.' })
  @ApiNotFoundResponse({ description: 'The customer does not exist.' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CustomerResponseDto> {
    const result = await this.getCustomer.execute(id);
    return result.match({
      ok: (customer) => CustomerResponseDto.fromDomain(customer),
      err: (error) => {
        throw toHttpException(error);
      },
    });
  }
}
