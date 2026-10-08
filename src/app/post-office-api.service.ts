import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreatePostOfficeRequest,
  CreateShipmentRequest,
  PagedResult,
  PostOfficeDto,
  ShipmentDto,
  UpdateShipmentRequest,
  UpdateShipmentStatusRequest
} from './models';
import { environment } from './environment';

export interface ShipmentQuery {
  status?: number | null;
  locationPostOfficeId?: string;
  weight?: number | null;
  shipmentNumber?: string;
  shipmentType?: string;
  pageNumber: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class PostOfficeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  getShipments(query: ShipmentQuery): Observable<PagedResult<ShipmentDto>> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize);

    if (query.status !== null && query.status !== undefined) params = params.set('status', query.status);
    if (query.weight !== null && query.weight !== undefined) params = params.set('weight', query.weight);
    if (query.locationPostOfficeId) params = params.set('locationPostOfficeId', query.locationPostOfficeId);
    if (query.shipmentNumber) params = params.set('shipmentNumber', query.shipmentNumber.trim());
    if (query.shipmentType) params = params.set('shipmentType', query.shipmentType);

    return this.http.get<PagedResult<ShipmentDto>>(`${this.baseUrl}/api/shipments`, { params });
  }

  getShipment(id: string): Observable<ShipmentDto> {
    return this.http.get<ShipmentDto>(`${this.baseUrl}/api/shipments/${encodeURIComponent(id)}`);
  }

  createShipment(request: CreateShipmentRequest): Observable<ShipmentDto> {
    return this.http.post<ShipmentDto>(`${this.baseUrl}/api/shipments`, request);
  }

  updateShipment(id: string, request: UpdateShipmentRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/shipments/${encodeURIComponent(id)}`, request);
  }

  deleteShipment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/shipments/${encodeURIComponent(id)}`);
  }

  updateShipmentStatus(id: string, request: UpdateShipmentStatusRequest): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/api/shipments/${encodeURIComponent(id)}/status`, request);
  }

  getPostOffices(): Observable<PostOfficeDto[]> {
    return this.http.get<PostOfficeDto[]>(`${this.baseUrl}/api/post-offices`);
  }

  getPostOffice(id: string): Observable<PostOfficeDto> {
    return this.http.get<PostOfficeDto>(`${this.baseUrl}/api/post-offices/${encodeURIComponent(id)}`);
  }

  createPostOffice(request: CreatePostOfficeRequest): Observable<PostOfficeDto> {
    return this.http.post<PostOfficeDto>(`${this.baseUrl}/api/post-offices`, request);
  }

  updatePostOffice(id: string, request: CreatePostOfficeRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/post-offices/${encodeURIComponent(id)}`, request);
  }

  deletePostOffice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/post-offices/${encodeURIComponent(id)}`);
  }
}