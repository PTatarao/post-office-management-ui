import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAlertCircle,
  LucideArrowRight,
  LucideBuilding2,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleCheck,
  LucideMapPin,
  LucidePackage,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideTrash2,
  LucideX
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import {
  CreatePostOfficeRequest,
  CreateShipmentRequest,
  PostOfficeDto,
  ShipmentDto,
  ShipmentStatus,
  WeightCategory
} from './models';
import { PostOfficeApiService } from './post-office-api.service';

type DialogMode = 'shipment' | 'status' | 'office' | null;
type ViewMode = 'shipments' | 'offices';

interface ShipmentFilters {
  status: number | null;
  weight: number | null;
  locationPostOfficeId: string;
  shipmentNumber: string;
  shipmentType: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAlertCircle,
    LucideArrowRight,
    LucideBuilding2,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleCheck,
    LucideMapPin,
    LucidePackage,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideTrash2,
    LucideX
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly api = inject(PostOfficeApiService);
  private readonly officeStorageKey = 'post-office-management.offices';

  readonly ShipmentStatus = ShipmentStatus;
  readonly WeightCategory = WeightCategory;
  readonly statusOptions = [
    { value: ShipmentStatus.OriginProcessed, label: 'Origin processed' },
    { value: ShipmentStatus.DestinationProcessed, label: 'Destination processed' },
    { value: ShipmentStatus.Delivered, label: 'Delivered' }
  ];
  readonly weightOptions = [
    { value: WeightCategory.UnderOneKg, label: 'Under 1 kg' },
    { value: WeightCategory.OneToFiveKg, label: '1 to 5 kg' },
    { value: WeightCategory.OverFiveKg, label: 'Over 5 kg' }
  ];

  readonly view = signal<ViewMode>('shipments');
  readonly shipments = signal<ShipmentDto[]>([]);
  readonly offices = signal<PostOfficeDto[]>(this.readOffices());
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly dialog = signal<DialogMode>(null);
  readonly notice = signal('');
  readonly error = signal('');
  readonly totalCount = signal(0);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(20);
  readonly totalPages = signal(0);
  readonly matchingCount = computed(() => this.totalCount());
  readonly resultRange = computed(() => {
    if (!this.totalCount()) return '0';
    return `${(this.pageNumber() - 1) * this.pageSize() + 1}-${Math.min(this.pageNumber() * this.pageSize(), this.totalCount())}`;
  });

  filters: ShipmentFilters = {
    status: null,
    weight: null,
    locationPostOfficeId: '',
    shipmentNumber: '',
    shipmentType: 'Package'
  };
  shipmentForm: CreateShipmentRequest = this.emptyShipmentForm();
  officeForm: CreatePostOfficeRequest = { zipCode: '', name: '', city: '' };
  statusForm: { status: ShipmentStatus; postOfficeId: string } = {
    status: ShipmentStatus.OriginProcessed,
    postOfficeId: ''
  };
  officeLookupId = '';
  editingShipment: ShipmentDto | null = null;
  editingOfficeId = '';
  statusShipment: ShipmentDto | null = null;

  constructor() {
    void this.loadShipments();
    void this.loadOffices();
  }

  async loadShipments(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await firstValueFrom(this.api.getShipments({
        ...this.filters,
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize()
      }));
      this.shipments.set(result.items ?? []);
      this.totalCount.set(result.totalCount ?? result.items?.length ?? 0);
      this.totalPages.set(result.totalPages ?? Math.ceil(this.totalCount() / this.pageSize()));
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error, 'Could not load shipments. Check the API connection and try again.'));
      this.shipments.set([]);
      this.totalCount.set(0);
      this.totalPages.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  async loadOffices(): Promise<void> {
    try {
      const offices = await firstValueFrom(this.api.getPostOffices());
      const list = offices ?? [];
      this.offices.set(list);
      this.persistOffices();
    } catch (error: unknown) {
      const cached = this.readOffices();
      if (cached.length) {
        this.offices.set(cached);
        return;
      }
      this.error.set(this.errorMessage(error, 'Could not load post offices from the backend.'));
    }
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    void this.loadShipments();
  }

  clearFilters(): void {
    this.filters = { status: null, weight: null, locationPostOfficeId: '', shipmentNumber: '', shipmentType: 'Package' };
    this.applyFilters();
  }

  changePage(direction: -1 | 1): void {
    const nextPage = this.pageNumber() + direction;
    if (nextPage < 1 || nextPage > this.totalPages()) return;
    this.pageNumber.set(nextPage);
    void this.loadShipments();
  }

  setView(view: ViewMode): void {
    this.view.set(view);
    this.notice.set('');
    this.error.set('');
  }

  openNewShipment(): void {
    this.editingShipment = null;
    this.shipmentForm = this.emptyShipmentForm();
    this.dialog.set('shipment');
  }

  openEditShipment(shipment: ShipmentDto): void {
    this.editingShipment = shipment;
    this.shipmentForm = {
      shipmentNumber: shipment.shipmentNumber,
      shipmentType: shipment.shipmentType,
      weightKg: shipment.weightKg,
      originPostOfficeId: shipment.originPostOfficeId,
      destinationPostOfficeId: shipment.destinationPostOfficeId
    };
    this.dialog.set('shipment');
  }

  async saveShipment(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      if (this.editingShipment) {
        await firstValueFrom(this.api.updateShipment(this.editingShipment.id, {
          weightKg: Number(this.shipmentForm.weightKg),
          originPostOfficeId: this.shipmentForm.originPostOfficeId.trim(),
          destinationPostOfficeId: this.shipmentForm.destinationPostOfficeId.trim()
        }));
        this.notice.set(`Shipment ${this.editingShipment.shipmentNumber} updated.`);
      } else {
        const created = await firstValueFrom(this.api.createShipment({
          ...this.shipmentForm,
          weightKg: Number(this.shipmentForm.weightKg),
          shipmentNumber: this.shipmentForm.shipmentNumber.trim(),
          originPostOfficeId: this.shipmentForm.originPostOfficeId.trim(),
          destinationPostOfficeId: this.shipmentForm.destinationPostOfficeId.trim()
        }));
        this.notice.set(`Shipment ${created.shipmentNumber} created.`);
      }
      this.dialog.set(null);
      await this.loadShipments();
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error, 'Shipment could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteShipment(shipment: ShipmentDto): Promise<void> {
    if (!window.confirm(`Remove shipment ${shipment.shipmentNumber}?`)) return;
    try {
      await firstValueFrom(this.api.deleteShipment(shipment.id));
      this.notice.set(`Shipment ${shipment.shipmentNumber} removed.`);
      await this.loadShipments();
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error, 'Shipment could not be removed.'));
    }
  }

  openStatusUpdate(shipment: ShipmentDto): void {
    this.statusShipment = shipment;
    this.statusForm = {
      status: Math.min(shipment.status + 1, ShipmentStatus.Delivered) as ShipmentStatus,
      postOfficeId: shipment.destinationPostOfficeId
    };
    this.dialog.set('status');
  }

  async saveStatus(): Promise<void> {
    if (!this.statusShipment) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.api.updateShipmentStatus(this.statusShipment.id, {
        status: Number(this.statusForm.status) as ShipmentStatus,
        postOfficeId: this.statusForm.postOfficeId.trim()
      }));
      this.notice.set(`Status updated for ${this.statusShipment.shipmentNumber}.`);
      this.dialog.set(null);
      await this.loadShipments();
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error, 'Shipment status could not be updated.'));
    } finally {
      this.saving.set(false);
    }
  }

  openNewOffice(): void {
    this.editingOfficeId = '';
    this.officeForm = { zipCode: '', name: '', city: '' };
    this.dialog.set('office');
  }

  openEditOffice(office: PostOfficeDto): void {
    this.editingOfficeId = office.id;
    this.officeForm = { zipCode: office.zipCode, name: office.name, city: office.city };
    this.dialog.set('office');
  }

  async saveOffice(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    const request = {
      zipCode: this.officeForm.zipCode.trim(),
      name: this.officeForm.name.trim(),
      city: this.officeForm.city.trim()
    };
    try {
      if (this.editingOfficeId) {
        await firstValueFrom(this.api.updatePostOffice(this.editingOfficeId, request));
        this.rememberOffice({ id: this.editingOfficeId, ...request });
        this.notice.set(`${request.name} updated.`);
      } else {
        const created = await firstValueFrom(this.api.createPostOffice(request));
        this.rememberOffice(created);
        this.notice.set(`${created.name} added to the office register.`);
      }
      this.dialog.set(null);
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error, 'Post office could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  async lookupOffice(): Promise<void> {
    const id = this.officeLookupId.trim();
    if (!id) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const office = await firstValueFrom(this.api.getPostOffice(id));
      this.rememberOffice(office);
      this.notice.set(`${office.name} loaded into the office register.`);
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error, 'No post office was found for that ID.'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteOffice(office: PostOfficeDto): Promise<void> {
    if (!window.confirm(`Remove ${office.name} (${office.zipCode})?`)) return;
    try {
      await firstValueFrom(this.api.deletePostOffice(office.id));
      this.offices.update((offices) => offices.filter((item) => item.id !== office.id));
      this.persistOffices();
      this.notice.set(`${office.name} removed.`);
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error, 'Post office could not be removed.'));
    }
  }

  closeDialog(): void {
    this.dialog.set(null);
    this.error.set('');
  }

  officeName(id: string): string {
    const office = this.offices().find((item) => item.id === id);
    return office ? `${office.name} · ${office.zipCode}` : this.shortId(id);
  }

  statusLabel(status: number): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? 'Unknown status';
  }

  statusClass(status: number): string {
    return ['origin', 'destination', 'delivered'][status] ?? 'unknown';
  }

  weightLabel(category: number): string {
    return this.weightOptions.find((option) => option.value === category)?.label ?? 'Unknown';
  }

  shortId(id: string): string {
    return id ? `${id.slice(0, 8)}…` : 'Not assigned';
  }

  private emptyShipmentForm(): CreateShipmentRequest {
    return {
      shipmentNumber: '',
      shipmentType: 'Package',
      weightKg: 1,
      originPostOfficeId: '',
      destinationPostOfficeId: ''
    };
  }

  private readOffices(): PostOfficeDto[] {
    try {
      const saved = localStorage.getItem(this.officeStorageKey);
      return saved ? JSON.parse(saved) as PostOfficeDto[] : [];
    } catch {
      return [];
    }
  }

  private rememberOffice(office: PostOfficeDto): void {
    this.offices.update((offices) => [office, ...offices.filter((item) => item.id !== office.id)]);
    this.persistOffices();
  }

  private persistOffices(): void {
    try {
      localStorage.setItem(this.officeStorageKey, JSON.stringify(this.offices()));
    } catch {
      this.error.set('Office details could not be saved in this browser.');
    }
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const body = error.error as { message?: unknown; title?: unknown } | string;
      if (typeof body === 'string' && body) return body;
      if (typeof body === 'object' && body !== null) {
        if (typeof body.message === 'string') return body.message;
        if (typeof body.title === 'string') return body.title;
      }
    }
    return fallback;
  }
}