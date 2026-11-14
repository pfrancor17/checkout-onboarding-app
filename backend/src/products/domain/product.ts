export interface ProductProps {
  id: string;
  sku: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: string;
  stock: number;
  imageUrl: string | null;
}

/** Product aggregate. Pure domain object: no framework or ORM code here. */
export class Product {
  private constructor(private readonly props: ProductProps) {}

  static fromProps(props: ProductProps): Product {
    return new Product({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get sku(): string {
    return this.props.sku;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string {
    return this.props.description;
  }
  get priceInCents(): number {
    return this.props.priceInCents;
  }
  get currency(): string {
    return this.props.currency;
  }
  get stock(): number {
    return this.props.stock;
  }
  get imageUrl(): string | null {
    return this.props.imageUrl;
  }

  isAvailable(): boolean {
    return this.props.stock > 0;
  }

  canFulfill(quantity: number): boolean {
    return Number.isInteger(quantity) && quantity > 0 && quantity <= this.stock;
  }
}
