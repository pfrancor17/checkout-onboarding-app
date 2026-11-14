import { ApiProperty } from '@nestjs/swagger';
import { AcceptanceTokens } from '../../domain/payment-gateway.port';

export class AcceptanceTokensResponseDto {
  @ApiProperty({ description: 'Token proving the customer accepted the terms' })
  acceptanceToken!: string;

  @ApiProperty({ description: 'Link to the terms and conditions (PDF)' })
  termsUrl!: string;

  @ApiProperty({
    description: 'Token proving the customer authorized personal data use',
  })
  personalDataAuthToken!: string;

  @ApiProperty({ description: 'Link to the personal data policy (PDF)' })
  personalDataPolicyUrl!: string;

  static fromDomain(tokens: AcceptanceTokens): AcceptanceTokensResponseDto {
    return { ...tokens };
  }
}
