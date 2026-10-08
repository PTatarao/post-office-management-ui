export enum ShipmentStatus {
  OriginProcessed = 0,
  DestinationProcessed = 1,
  Delivered = 2
}

export enum WeightCategory {
  UnderOneKg = 0,
  OneToFiveKg = 1,
  OverFiveKg = 2
}

export interface PostOfficeDto {
  id: string;
  zipCode: string;
  name: string;
  city: string;
}

export interface ShipmentDto {
  id: string;
  shipmentNumber: string;
  shipmentType: string;
  weightKg: number;
  weightCategory: WeightCategory;
  status: ShipmentStatus;
  originPostOfficeId: string;
  destinationPostOfficeId: string;
  currentPostOfficeId: string;
  createdAtUtc: string;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
}

export interface CreatePostOfficeRequest {
  zipCode: string;
  name: string;
  city: string;
}

export interface CreateShipmentRequest {
  shipmentNumber: string;
  shipmentType: string;
  weightKg: number;
  originPostOfficeId: string;
  destinationPostOfficeId: string;
}

export interface UpdateShipmentRequest {
  weightKg: number;
  originPostOfficeId: string;
  destinationPostOfficeId: string;
}

export interface UpdateShipmentStatusRequest {
  status: ShipmentStatus;
  postOfficeId: string;
}